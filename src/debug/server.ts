/**
 * Debug Server — runs on port 9222
 *
 * Provides:
 *   GET /              — Live debug dashboard (HTML)
 *   GET /api/logs      — Recent log entries (JSON, supports ?limit=N&level=error)
 *   GET /api/errors    — Error entries only (JSON)
 *   GET /api/health    — System health check (DB, Redis, Evolution API)
 *   GET /api/stats     — Request/error stats
 *   GET /api/trace/:id — Trace a specific request by ID
 *   WS  /ws            — WebSocket for live log streaming
 */

import http from 'http';
import { logger } from '../config/logger';
import { prisma } from '../db/prisma';
import { redisConnection } from '../queue/setup';
import { ERROR_DESCRIPTIONS, ErrorCode } from '../errors/codes';

const PORT = Number(process.env.DEBUG_PORT) || 9222;

// In-memory ring buffer for recent logs (last 2000)
interface LogEntry {
  id: string;
  level: string;
  time: string;
  code?: string;
  msg: string;
  category: string; // frontend | backend | db | docker | api | ai | system
  meta?: Record<string, unknown>;
}

const logBuffer: LogEntry[] = [];
const MAX_LOGS = 2000;
let logIdCounter = 0;

// Error counters by code
const errorCounts: Record<string, number> = {};

// Category counts for tab badges
const categoryCounts: Record<string, number> = {
  frontend: 0,
  backend: 0,
  db: 0,
  docker: 0,
  api: 0,
  ai: 0,
  system: 0,
};

// Request stats
const requestStats = {
  total: 0,
  errors: 0,
  lastMinute: [] as number[],
};

/**
 * Add a log entry to the ring buffer
 */
export function addLog(level: string, msg: string, code?: string, meta?: Record<string, unknown>) {
  // Derive category from meta.category or msg prefix
  const category = (meta?.category as string) ||
    (msg.startsWith('[FRONTEND]') ? 'frontend' :
     msg.startsWith('[DATABASE]') || msg.startsWith('[DB]') ? 'db' :
     msg.startsWith('[DOCKER]') ? 'docker' :
     msg.startsWith('[API]') ? 'api' :
     msg.startsWith('[AI]') ? 'ai' :
     msg.startsWith('[AUTH]') ? 'backend' :
     msg.startsWith('[BACKEND]') ? 'backend' : 'system');

  const entry: LogEntry = {
    id: String(++logIdCounter),
    level,
    time: new Date().toISOString(),
    code,
    msg,
    category,
    meta,
  };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOGS) logBuffer.shift();

  if (code && (level === 'error' || level === 'fatal')) {
    errorCounts[code] = (errorCounts[code] || 0) + 1;
  }

  // Update category counts
  if (categoryCounts[category] !== undefined) {
    categoryCounts[category]++;
  } else {
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  }

  // Broadcast to connected SSE clients
  broadcastToClients(JSON.stringify({ type: 'log', data: entry }));
}

/**
 * Record an error with code
 */
export function recordError(code: ErrorCode, detail?: string, meta?: Record<string, unknown>) {
  errorCounts[code] = (errorCounts[code] || 0) + 1;
  addLog('error', detail || ERROR_DESCRIPTIONS[code] || code, code, meta);
}

/**
 * Record a request
 */
export function recordRequest(status: number, path: string, duration: number) {
  requestStats.total++;
  if (status >= 400) requestStats.errors++;
  const now = Date.now();
  requestStats.lastMinute.push(now);
  requestStats.lastMinute = requestStats.lastMinute.filter(t => now - t < 60_000);
  addLog('info', `${status} ${path} ${duration}ms`, undefined, { status, path, duration });
}

// WebSocket clients
const wsClients = new Set<any>();

function broadcastToClients(data: string) {
  for (const client of wsClients) {
    try { client.write(`data: ${data}\n\n`); } catch { wsClients.delete(client); }
  }
}

/**
 * System health check
 */
async function getSystemHealth() {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  // Postgres
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = { status: 'ok', latency: Date.now() - start };
  } catch (err: any) {
    checks.postgres = { status: 'error', error: err.message };
  }

  // Redis
  try {
    const start = Date.now();
    await redisConnection.ping();
    checks.redis = { status: 'ok', latency: Date.now() - start };
  } catch (err: any) {
    checks.redis = { status: 'error', error: err.message };
  }

  // Evolution API
  try {
    const start = Date.now();
    const url = process.env.EVOLUTION_API_URL || 'http://localhost:8081';
    const res = await fetch(`${url}/instance/fetchInstances`, {
      headers: { apikey: process.env.EVOLUTION_API_KEY || '' },
      signal: AbortSignal.timeout(5000),
    });
    checks.evolutionApi = { status: res.ok ? 'ok' : 'degraded', latency: Date.now() - start };
  } catch (err: any) {
    checks.evolutionApi = { status: 'error', error: err.message };
  }

  return checks;
}

// ---------------------------------------------------------------------------
// Proxy stats endpoint
// ---------------------------------------------------------------------------
import { getProxyStats } from '../middleware/httpProxy';

/**
 * Start the debug server
 */
export function startDebugServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    const path = url.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // L-004: Optional bearer auth — set DEBUG_TOKEN env var to protect this server
    const debugToken = process.env.DEBUG_TOKEN;
    if (!debugToken) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server misconfigured — DEBUG_TOKEN missing' }));
      return;
    }
    const auth = req.headers.authorization;
    const queryToken = url.searchParams.get('token');
    
    let providedToken = null;
    if (auth && auth.startsWith('Bearer ')) {
      providedToken = auth.slice(7);
    } else if (queryToken) {
      providedToken = queryToken;
    }

    if (!providedToken || providedToken !== debugToken) {
      res.writeHead(401, { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer realm="debug"' });
      res.end(JSON.stringify({ error: 'Unauthorized — set Authorization: Bearer <DEBUG_TOKEN> or use ?token=<DEBUG_TOKEN>' }));
      return;
    }

    // Dashboard HTML
    if (path === '/' && req.headers.accept?.includes('text/html')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getDashboardHTML());
      return;
    }

    // Logs
    if (path === '/api/logs') {
      const limit = Number(url.searchParams.get('limit')) || 200;
      const level = url.searchParams.get('level');
      const category = url.searchParams.get('category');
      let logs = [...logBuffer].reverse();
      if (level) logs = logs.filter(l => l.level === level);
      if (category && category !== 'all') logs = logs.filter(l => l.category === category);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ logs: logs.slice(0, limit), total: logBuffer.length }));
      return;
    }

    // Errors
    if (path === '/api/errors') {
      const errors = [...logBuffer].reverse().filter(l => l.level === 'error' || l.level === 'fatal');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ errors, counts: errorCounts }));
      return;
    }

    // Health
    if (path === '/api/health') {
      const health = await getSystemHealth();
      const allOk = Object.values(health).every(c => c.status === 'ok');
      res.writeHead(allOk ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: allOk ? 'healthy' : 'degraded', checks: health }));
      return;
    }

    // Stats
    if (path === '/api/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        requests: requestStats,
        errorsByCode: errorCounts,
        totalErrors: Object.values(errorCounts).reduce((a, b) => a + b, 0),
      }));
      return;
    }

    // Proxy stats
    if (path === '/api/proxy') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getProxyStats(), null, 2));
      return;
    }

    // Category counts
    if (path === '/api/categories') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ categories: categoryCounts, total: logBuffer.length }));
      return;
    }

    // SSE stream for live logs
    if (path === '/api/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      wsClients.add(res);
      req.on('close', () => wsClients.delete(res));
      return;
    }

    // Error code descriptions
    if (path === '/api/error-codes') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(ERROR_DESCRIPTIONS));
      return;
    }

    // Accept log POST from frontend
    if (path === '/api/log' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => body += chunk);
      req.on('end', () => {
        try {
          const entry = JSON.parse(body);
          addLog(entry.level || 'error', `[FE] ${entry.message}`, entry.code, { ...entry.meta, source: 'frontend', detail: entry.detail });
        } catch (err: any) {
          logger.debug({ err: err.message }, 'Failed to parse incoming frontend log');
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      });
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  // Kill any leftover process on the debug port before binding
  try {
    const { execSync } = require('child_process');
    execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null`, { timeout: 2000 });
  } catch (err: any) {
    logger.debug({ err: err.message }, 'Port was free or kill failed — proceeding to listen');
  }

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn({ port: PORT }, `Debug server port ${PORT} still in use after kill attempt, skipping`);
    } else {
      logger.warn({ err }, 'Debug server error');
    }
  });

  server.listen(PORT, () => {
    logger.info({ port: PORT }, `Debug server running at http://localhost:${PORT}`);
    addLog('info', `Debug server started on port ${PORT}`, undefined, { port: PORT });
  });

  return server;
}

/**
 * Dashboard HTML — Whatsie Debug Console
 * NPM error-box style. 6 source tabs. Real-time SSE. Self-contained.
 */
function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Whatsie Debug Console</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --border: #1e1e2e;
    --border2: #2a2a3e;
    --text: #c9c9d9;
    --muted: #5a5a7a;
    --green: #22c55e;
    --yellow: #eab308;
    --red: #ef4444;
    --blue: #3b82f6;
    --purple: #a855f7;
    --cyan: #06b6d4;
    --orange: #f97316;
    --font: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  }
  html, body { height: 100%; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font); font-size: 12px; }

  /* ── HEADER ─────────────────────────────── */
  .header {
    display: flex; align-items: center; gap: 16px;
    padding: 10px 20px; border-bottom: 1px solid var(--border);
    background: var(--surface); user-select: none; flex-shrink: 0;
  }
  .header-logo { font-size: 13px; font-weight: 700; color: #fff; letter-spacing: 0.05em; }
  .header-logo span { color: var(--green); }
  .header-sep { flex: 1; }
  .live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); animation: pulse 2s infinite; }
  .live-dot.off { background: var(--red); animation: none; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .header-info { font-size: 11px; color: var(--muted); }
  .search-bar {
    background: var(--bg); border: 1px solid var(--border2); border-radius: 6px;
    padding: 5px 10px; color: var(--text); font-family: var(--font); font-size: 12px;
    width: 220px; outline: none;
  }
  .search-bar:focus { border-color: var(--blue); }
  .level-btn {
    padding: 4px 10px; border-radius: 5px; border: 1px solid var(--border2);
    background: transparent; color: var(--muted); font-family: var(--font); font-size: 11px;
    cursor: pointer; transition: all 0.15s;
  }
  .level-btn:hover, .level-btn.active { background: var(--border2); color: var(--text); }
  .level-btn[data-level="error"].active { background: #3b0000; border-color: var(--red); color: var(--red); }
  .level-btn[data-level="warn"].active  { background: #2d2500; border-color: var(--yellow); color: var(--yellow); }
  .level-btn[data-level="info"].active  { background: #001a3b; border-color: var(--blue); color: var(--blue); }

  /* ── LAYOUT ─────────────────────────────── */
  .layout { display: flex; height: calc(100vh - 45px); }

  /* ── LEFT SIDEBAR ───────────────────────── */
  .sidebar { width: 220px; flex-shrink: 0; border-right: 1px solid var(--border); background: var(--surface); display: flex; flex-direction: column; overflow: hidden; }
  .sidebar-tabs { display: flex; flex-direction: column; padding: 12px 8px; gap: 2px; }
  .tab {
    display: flex; align-items: center; gap: 8px; padding: 7px 10px;
    border-radius: 6px; cursor: pointer; transition: all 0.12s; border: 1px solid transparent;
    color: var(--muted); font-size: 12px;
  }
  .tab:hover { background: var(--border); color: var(--text); }
  .tab.active { background: var(--border2); border-color: var(--border2); color: #fff; }
  .tab-icon { width: 16px; text-align: center; font-size: 11px; }
  .tab-name { flex: 1; }
  .tab-badge {
    min-width: 20px; height: 18px; padding: 0 5px; border-radius: 9px; font-size: 10px;
    display: flex; align-items: center; justify-content: center; font-weight: 700;
    background: var(--border2); color: var(--muted);
  }
  .tab.active .tab-badge { background: #333; color: #aaa; }
  .tab[data-cat="frontend"] .tab-icon { color: var(--cyan); }
  .tab[data-cat="backend"] .tab-icon { color: var(--green); }
  .tab[data-cat="db"] .tab-icon { color: var(--blue); }
  .tab[data-cat="docker"] .tab-icon { color: var(--orange); }
  .tab[data-cat="api"] .tab-icon { color: var(--purple); }
  .tab[data-cat="ai"] .tab-icon { color: var(--yellow); }
  .tab[data-cat="all"] .tab-icon { color: var(--text); }

  .sidebar-divider { height: 1px; background: var(--border); margin: 8px 10px; }

  /* Stats panel */
  .sidebar-stats { padding: 12px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
  .stat-card { background: var(--bg); border: 1px solid var(--border); border-radius: 7px; padding: 10px 12px; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 4px; }
  .stat-val { font-size: 20px; font-weight: 700; }
  .stat-val.red { color: var(--red); }
  .stat-val.green { color: var(--green); }
  .health-row { display: flex; align-items: center; gap: 6px; padding: 3px 0; font-size: 11px; }
  .health-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .health-dot.ok { background: var(--green); }
  .health-dot.error { background: var(--red); }
  .health-dot.degraded { background: var(--yellow); }
  .health-name { flex: 1; color: var(--text); }
  .health-ms { color: var(--muted); font-size: 10px; }

  /* ── LOG PANEL ──────────────────────────── */
  .log-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .log-panel-header {
    display: flex; align-items: center; gap: 10px; padding: 8px 14px;
    border-bottom: 1px solid var(--border); background: var(--surface); flex-shrink: 0;
  }
  .log-panel-title { font-size: 12px; color: var(--text); font-weight: 600; flex: 1; }
  .log-count { font-size: 11px; color: var(--muted); }
  .scroll-pause-btn {
    padding: 3px 9px; border-radius: 4px; border: 1px solid var(--border2);
    background: transparent; color: var(--muted); font-family: var(--font); font-size: 11px; cursor: pointer;
  }
  .scroll-pause-btn:hover { background: var(--border2); color: var(--text); }
  .clear-btn {
    padding: 3px 9px; border-radius: 4px; border: 1px solid var(--border2);
    background: transparent; color: var(--muted); font-family: var(--font); font-size: 11px; cursor: pointer;
  }
  .clear-btn:hover { background: #3b0000; color: var(--red); border-color: var(--red); }

  .log-stream { flex: 1; overflow-y: auto; padding: 8px 0; }
  .log-stream::-webkit-scrollbar { width: 6px; }
  .log-stream::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

  /* NPM error box style log entries */
  .log-entry {
    display: flex; align-items: flex-start; gap: 0;
    border-left: 3px solid transparent;
    padding: 4px 14px 4px 11px;
    cursor: pointer; transition: background 0.1s;
    border-bottom: 1px solid transparent;
  }
  .log-entry:hover { background: rgba(255,255,255,0.03); }
  .log-entry.expanded { background: rgba(255,255,255,0.04); border-bottom-color: var(--border); }
  .log-entry.level-error { border-left-color: var(--red); }
  .log-entry.level-fatal { border-left-color: #dc2626; }
  .log-entry.level-warn  { border-left-color: var(--yellow); }
  .log-entry.level-info  { border-left-color: var(--border2); }
  .log-entry.level-debug { border-left-color: transparent; opacity: 0.6; }

  .le-time { color: var(--muted); width: 72px; flex-shrink: 0; padding-top: 1px; font-size: 11px; }
  .le-level { width: 44px; flex-shrink: 0; font-weight: 700; font-size: 10px; text-transform: uppercase; padding-top: 2px; }
  .le-level.error, .le-level.fatal { color: var(--red); }
  .le-level.warn  { color: var(--yellow); }
  .le-level.info  { color: var(--blue); }
  .le-level.debug { color: var(--muted); }

  .le-cat { font-size: 10px; padding: 1px 5px; border-radius: 3px; margin-right: 6px; flex-shrink: 0; margin-top: 2px; font-weight: 600; }
  .le-cat.frontend { background: #0f2d33; color: var(--cyan); }
  .le-cat.backend  { background: #0d2b18; color: var(--green); }
  .le-cat.db       { background: #0a1d3b; color: var(--blue); }
  .le-cat.docker   { background: #2d1a0a; color: var(--orange); }
  .le-cat.api      { background: #1d0d3b; color: var(--purple); }
  .le-cat.ai       { background: #2d2500; color: var(--yellow); }
  .le-cat.system   { background: #1a1a2e; color: var(--muted); }

  .le-body { flex: 1; min-width: 0; }
  .le-msg { color: var(--text); word-break: break-word; line-height: 1.5; }
  .le-code { display: inline-block; background: var(--border2); color: #f87171; font-size: 10px; padding: 1px 5px; border-radius: 3px; margin-left: 6px; vertical-align: middle; }

  .le-meta { 
    margin-top: 6px; padding: 8px 10px; background: var(--bg); border-radius: 5px;
    border: 1px solid var(--border); font-size: 11px; color: var(--muted);
    white-space: pre-wrap; word-break: break-all; display: none;
  }
  .log-entry.expanded .le-meta { display: block; }

  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: var(--muted); gap: 8px; }
  .empty-icon { font-size: 32px; }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-logo">WHATSIE <span>DEBUG</span></div>
  <div id="live-dot" class="live-dot off" title="SSE stream"></div>
  <input class="search-bar" id="searchInput" placeholder="Filter logs..." oninput="onSearch()">
  <button class="level-btn active" data-level="all" onclick="setLevel('all',this)">ALL</button>
  <button class="level-btn" data-level="error" onclick="setLevel('error',this)">ERRORS</button>
  <button class="level-btn" data-level="warn" onclick="setLevel('warn',this)">WARN</button>
  <button class="level-btn" data-level="info" onclick="setLevel('info',this)">INFO</button>
  <div class="header-sep"></div>
  <div class="header-info" id="uptimeLabel">uptime: --</div>
</div>

<div class="layout">
  <!-- LEFT SIDEBAR -->
  <div class="sidebar">
    <div class="sidebar-tabs">
      <div class="tab active" data-cat="all" onclick="setCategory('all',this)">
        <span class="tab-icon">≡</span>
        <span class="tab-name">All Logs</span>
        <span class="tab-badge" id="badge-all">0</span>
      </div>
      <div class="tab" data-cat="frontend" onclick="setCategory('frontend',this)">
        <span class="tab-icon">⬡</span>
        <span class="tab-name">Frontend</span>
        <span class="tab-badge" id="badge-frontend">0</span>
      </div>
      <div class="tab" data-cat="backend" onclick="setCategory('backend',this)">
        <span class="tab-icon">⚙</span>
        <span class="tab-name">Backend</span>
        <span class="tab-badge" id="badge-backend">0</span>
      </div>
      <div class="tab" data-cat="db" onclick="setCategory('db',this)">
        <span class="tab-icon">⊞</span>
        <span class="tab-name">Database</span>
        <span class="tab-badge" id="badge-db">0</span>
      </div>
      <div class="tab" data-cat="docker" onclick="setCategory('docker',this)">
        <span class="tab-icon">◈</span>
        <span class="tab-name">Docker</span>
        <span class="tab-badge" id="badge-docker">0</span>
      </div>
      <div class="tab" data-cat="api" onclick="setCategory('api',this)">
        <span class="tab-icon">⇄</span>
        <span class="tab-name">API</span>
        <span class="tab-badge" id="badge-api">0</span>
      </div>
      <div class="tab" data-cat="ai" onclick="setCategory('ai',this)">
        <span class="tab-icon">✦</span>
        <span class="tab-name">AI</span>
        <span class="tab-badge" id="badge-ai">0</span>
      </div>
    </div>

    <div class="sidebar-divider"></div>

    <div class="sidebar-stats">
      <div class="stat-card">
        <div class="stat-label">Req / min</div>
        <div class="stat-val green" id="reqMin">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Errors</div>
        <div class="stat-val red" id="errTotal">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Service Health</div>
        <div id="healthList"><div style="color:var(--muted);font-size:11px">Loading...</div></div>
      </div>
    </div>
  </div>

  <!-- LOG PANEL -->
  <div class="log-panel">
    <div class="log-panel-header">
      <span class="log-panel-title" id="panelTitle">All Logs</span>
      <span class="log-count" id="logCount">0 entries</span>
      <button class="scroll-pause-btn" id="pauseBtn" onclick="togglePause()">⏸ Pause</button>
      <button class="clear-btn" onclick="clearLogs()">✕ Clear</button>
    </div>
    <div class="log-stream" id="logStream">
      <div class="empty-state"><div class="empty-icon">⟳</div><div>Waiting for logs…</div></div>
    </div>
  </div>
</div>

<script>
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token') || '';
const headers = token ? { 'Authorization': 'Bearer ' + token } : {};

let logs = [];
let currentCat = 'all';
let currentLevel = 'all';
let searchQuery = '';
let paused = false;
let autoScroll = true;

const CATEGORY_LABELS = {
  frontend: 'FRONTEND', backend: 'BACKEND', db: 'DB',
  docker: 'DOCKER', api: 'API', ai: 'AI', system: 'SYS'
};

function esc(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t]));
}

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'}) +
    '.' + String(d.getMilliseconds()).padStart(3,'0');
}

function buildEntry(l) {
  const cat = l.category || 'system';
  const catLabel = CATEGORY_LABELS[cat] || cat.toUpperCase();
  const metaStr = l.meta ? JSON.stringify(l.meta, null, 2) : null;
  return \`<div class="log-entry level-\${esc(l.level)}" id="le-\${esc(l.id)}" onclick="toggleMeta(this)">
    <span class="le-time">\${fmtTime(l.time)}</span>
    <span class="le-level \${esc(l.level)}">\${esc(l.level)}</span>
    <span class="le-cat \${esc(cat)}">\${esc(catLabel)}</span>
    <span class="le-body">
      <span class="le-msg">\${esc(l.msg)}\${l.code ? '<span class="le-code">'+esc(l.code)+'</span>' : ''}</span>
      \${metaStr ? '<div class="le-meta"><pre>'+esc(metaStr)+'</pre></div>' : ''}
    </span>
  </div>\`;
}

function toggleMeta(el) {
  el.classList.toggle('expanded');
}

function getFiltered() {
  return logs.filter(l => {
    if (currentCat !== 'all' && l.category !== currentCat) return false;
    if (currentLevel !== 'all' && l.level !== currentLevel) return false;
    if (searchQuery && !l.msg.toLowerCase().includes(searchQuery)) return false;
    return true;
  });
}

function renderLogs() {
  const filtered = getFiltered();
  const stream = document.getElementById('logStream');
  const count = document.getElementById('logCount');
  count.textContent = filtered.length + ' entries';
  if (filtered.length === 0) {
    stream.innerHTML = '<div class="empty-state"><div class="empty-icon">○</div><div>No logs match filters</div></div>';
    return;
  }
  stream.innerHTML = filtered.slice(0, 500).map(buildEntry).join('');
  if (autoScroll && !paused) {
    stream.scrollTop = stream.scrollHeight;
  }
}

function prependEntry(entry) {
  if (paused) return;
  const filtered = getFiltered();
  const stream = document.getElementById('logStream');
  // Remove empty state
  const empty = stream.querySelector('.empty-state');
  if (empty) empty.remove();

  // Check if entry passes filters
  if (currentCat !== 'all' && entry.category !== currentCat) return;
  if (currentLevel !== 'all' && entry.level !== currentLevel) return;
  if (searchQuery && !entry.msg.toLowerCase().includes(searchQuery)) return;

  const div = document.createElement('div');
  div.innerHTML = buildEntry(entry);
  stream.prepend(div.firstChild);

  // Trim to 500
  const entries = stream.querySelectorAll('.log-entry');
  if (entries.length > 500) entries[entries.length - 1].remove();

  const count = document.getElementById('logCount');
  count.textContent = (parseInt(count.textContent) + 1) + ' entries';
}

function setCategory(cat, el) {
  currentCat = cat;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const titles = { all:'All Logs', frontend:'Frontend', backend:'Backend', db:'Database', docker:'Docker', api:'API', ai:'AI' };
  document.getElementById('panelTitle').textContent = titles[cat] || cat;
  renderLogs();
}

function setLevel(lvl, el) {
  currentLevel = lvl;
  document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderLogs();
}

function onSearch() {
  searchQuery = document.getElementById('searchInput').value.toLowerCase();
  renderLogs();
}

function togglePause() {
  paused = !paused;
  const btn = document.getElementById('pauseBtn');
  btn.textContent = paused ? '▶ Resume' : '⏸ Pause';
}

function clearLogs() {
  logs = [];
  document.getElementById('logStream').innerHTML = '<div class="empty-state"><div class="empty-icon">○</div><div>Cleared</div></div>';
  document.getElementById('logCount').textContent = '0 entries';
}

async function fetchInitialLogs() {
  try {
    const q = new URLSearchParams({ limit: '200' });
    if (token) q.set('token', token);
    const res = await fetch('/api/logs?' + q, { headers });
    const data = await res.json();
    logs = [...data.logs].reverse(); // oldest first
    renderLogs();
  } catch(e) { console.warn('Could not fetch initial logs:', e); }
}

async function fetchStats() {
  try {
    const [statsRes, healthRes, catRes] = await Promise.all([
      fetch('/api/stats', { headers }),
      fetch('/api/health', { headers }),
      fetch('/api/categories', { headers }),
    ]);
    const stats = await statsRes.json();
    const health = await healthRes.json();
    const catData = await catRes.json();

    document.getElementById('reqMin').textContent = stats.requests.lastMinute.length;
    document.getElementById('errTotal').textContent = stats.totalErrors;

    // Health list
    const hl = document.getElementById('healthList');
    hl.innerHTML = Object.entries(health.checks).map(([name, c]) =>
      \`<div class="health-row"><span class="health-dot \${esc(c.status)}"></span><span class="health-name">\${esc(name)}</span>\${c.latency ? '<span class="health-ms">'+c.latency+'ms</span>' : ''}</div>\`
    ).join('');

    // Category badges
    const cats = catData.categories || {};
    const total = Object.values(cats).reduce((a,b) => a + b, 0);
    document.getElementById('badge-all').textContent = total > 999 ? '999+' : total;
    for (const [cat, count] of Object.entries(cats)) {
      const el = document.getElementById('badge-' + cat);
      if (el) el.textContent = count > 999 ? '999+' : count;
    }
  } catch(e) { /* silently ignore */ }
}

// SSE stream
function connectStream() {
  const streamUrl = '/api/stream' + (token ? '?token=' + encodeURIComponent(token) : '');
  const dot = document.getElementById('live-dot');
  const es = new EventSource(streamUrl);

  es.onopen = () => {
    dot.classList.remove('off');
  };

  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'log') {
        logs.unshift(msg.data);
        if (logs.length > 2000) logs.pop();
        prependEntry(msg.data);
      }
    } catch(err) {}
  };

  es.onerror = () => {
    dot.classList.add('off');
    setTimeout(connectStream, 3000);
  };
}

// Uptime display
const startedAt = Date.now();
setInterval(() => {
  const s = Math.floor((Date.now() - startedAt) / 1000);
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
  document.getElementById('uptimeLabel').textContent =
    'uptime: ' + [h,m,ss].map(n => String(n).padStart(2,'0')).join(':');
}, 1000);

// Init
fetchInitialLogs();
fetchStats();
setInterval(fetchStats, 5000);
connectStream();
</script>
</body>
</html>`;
}
