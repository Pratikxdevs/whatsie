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

// In-memory ring buffer for recent logs (last 1000)
interface LogEntry {
  id: string;
  level: string;
  time: string;
  code?: string;
  msg: string;
  meta?: Record<string, unknown>;
}

const logBuffer: LogEntry[] = [];
const MAX_LOGS = 1000;
let logIdCounter = 0;

// Error counters by code
const errorCounts: Record<string, number> = {};

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
  const entry: LogEntry = {
    id: String(++logIdCounter),
    level,
    time: new Date().toISOString(),
    code,
    msg,
    meta,
  };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOGS) logBuffer.shift();

  if (code && (level === 'error' || level === 'fatal')) {
    errorCounts[code] = (errorCounts[code] || 0) + 1;
  }

  // Broadcast to connected WebSocket clients
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
    if (debugToken) {
      const auth = req.headers.authorization;
      if (!auth || auth !== `Bearer ${debugToken}`) {
        res.writeHead(401, { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer realm="debug"' });
        res.end(JSON.stringify({ error: 'Unauthorized — set Authorization: Bearer <DEBUG_TOKEN>' }));
        return;
      }
    }

    // Dashboard HTML
    if (path === '/' && req.headers.accept?.includes('text/html')) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(getDashboardHTML());
      return;
    }

    // Logs
    if (path === '/api/logs') {
      const limit = Number(url.searchParams.get('limit')) || 100;
      const level = url.searchParams.get('level');
      let logs = [...logBuffer].reverse();
      if (level) logs = logs.filter(l => l.level === level);
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
 * Dashboard HTML — self-contained, no external deps
 */
function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CrmV2 Debug Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'SF Mono', 'Fira Code', monospace; background: #09090b; color: #e4e4e7; font-size: 13px; }
  .header { background: #18181b; border-bottom: 1px solid #27272a; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 16px; color: #fafafa; }
  .header .status { display: flex; gap: 8px; align-items: center; }
  .dot { width: 8px; height: 8px; border-radius: 50%; }
  .dot.ok { background: #22c55e; }
  .dot.error { background: #ef4444; }
  .dot.degraded { background: #eab308; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; padding: 24px; }
  .card { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; }
  .card h2 { font-size: 12px; text-transform: uppercase; color: #71717a; letter-spacing: 1px; margin-bottom: 12px; }
  .stat { font-size: 28px; font-weight: bold; }
  .stat.error { color: #ef4444; }
  .stat.ok { color: #22c55e; }
  .logs { grid-column: 1 / -1; }
  .log-entry { padding: 8px 12px; border-bottom: 1px solid #27272a; display: flex; gap: 12px; font-size: 12px; }
  .log-entry:hover { background: #1c1c1f; }
  .log-time { color: #52525b; min-width: 80px; }
  .log-level { min-width: 50px; font-weight: bold; }
  .log-level.error { color: #ef4444; }
  .log-level.fatal { color: #dc2626; }
  .log-level.warn { color: #eab308; }
  .log-level.info { color: #3b82f6; }
  .log-code { background: #27272a; padding: 1px 6px; border-radius: 4px; color: #a1a1aa; font-size: 11px; }
  .log-msg { color: #d4d4d8; flex: 1; }
  .error-table { width: 100%; border-collapse: collapse; }
  .error-table th { text-align: left; padding: 8px; border-bottom: 1px solid #27272a; color: #71717a; font-size: 11px; }
  .error-table td { padding: 8px; border-bottom: 1px solid #1c1c1f; }
  .error-code { background: #27272a; padding: 2px 8px; border-radius: 4px; color: #f87171; }
  .controls { display: flex; gap: 8px; }
  .btn { background: #27272a; border: 1px solid #3f3f46; color: #d4d4d8; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; }
  .btn:hover { background: #3f3f46; }
  .btn.active { background: #22c55e; color: #000; border-color: #22c55e; }
  .health-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .health-item { display: flex; align-items: center; gap: 8px; padding: 8px; background: #09090b; border-radius: 6px; }
  .health-name { color: #a1a1aa; }
  .health-latency { color: #52525b; margin-left: auto; }
</style>
</head>
<body>
<div class="header">
  <h1>CrmV2 Debug Dashboard</h1>
  <div class="controls">
    <button class="btn active" onclick="setFilter('all')">All</button>
    <button class="btn" onclick="setFilter('error')">Errors</button>
    <button class="btn" onclick="setFilter('warn')">Warnings</button>
    <button class="btn" onclick="setFilter('info')">Info</button>
    <button class="btn" onclick="refreshHealth()">Refresh Health</button>
  </div>
</div>

<div class="grid">
  <div class="card">
    <h2>Requests (last min)</h2>
    <div class="stat" id="reqCount">0</div>
  </div>
  <div class="card">
    <h2>Total Errors</h2>
    <div class="stat error" id="errCount">0</div>
  </div>
  <div class="card">
    <h2>System Status</h2>
    <div id="sysStatus"><span class="dot ok"></span> Checking...</div>
  </div>

  <div class="card" style="grid-column: 1 / -1;">
    <h2>Service Health</h2>
    <div class="health-grid" id="healthGrid">Loading...</div>
  </div>

  <div class="card" style="grid-column: 1 / -1;">
    <h2>Error Codes</h2>
    <table class="error-table" id="errorTable">
      <thead><tr><th>Code</th><th>Count</th><th>Description</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>

  <div class="card logs">
    <h2>Live Logs <span id="logCount" style="color:#52525b">(0)</span></h2>
    <div id="logContainer" style="max-height: 500px; overflow-y: auto;"></div>
  </div>
</div>

<script>
let currentFilter = 'all';
let logs = [];

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.controls .btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderLogs();
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

function renderLogs() {
  const container = document.getElementById('logContainer');
  const filtered = currentFilter === 'all' ? logs : logs.filter(l => l.level === currentFilter);
  container.innerHTML = filtered.slice(0, 200).map(l => \`
    <div class="log-entry">
      <span class="log-time">\${formatTime(l.time)}</span>
      <span class="log-level \${l.level}">\${l.level.toUpperCase()}</span>
      \${l.code ? '<span class="log-code">' + l.code + '</span>' : ''}
      <span class="log-msg">\${l.msg}</span>
    </div>
  \`).join('');
  document.getElementById('logCount').textContent = '(' + filtered.length + ')';
}

async function fetchStats() {
  try {
    const [statsRes, healthRes] = await Promise.all([
      fetch('/api/stats'),
      fetch('/api/health')
    ]);
    const stats = await statsRes.json();
    const health = await healthRes.json();

    document.getElementById('reqCount').textContent = stats.requests.lastMinute.length;
    document.getElementById('errCount').textContent = stats.totalErrors;

    const allOk = health.status === 'healthy';
    document.getElementById('sysStatus').innerHTML = \`<span class="dot \${allOk ? 'ok' : 'error'}"></span> \${health.status}\`;

    const grid = document.getElementById('healthGrid');
    grid.innerHTML = Object.entries(health.checks).map(([name, check]) => \`
      <div class="health-item">
        <span class="dot \${check.status}"></span>
        <span class="health-name">\${name}</span>
        \${check.latency ? '<span class="health-latency">' + check.latency + 'ms</span>' : ''}
        \${check.error ? '<span style="color:#ef4444;font-size:11px">' + check.error.slice(0,50) + '</span>' : ''}
      </div>
    \`).join('');

    const tbody = document.querySelector('#errorTable tbody');
    tbody.innerHTML = Object.entries(stats.errorsByCode).map(([code, count]) => \`
      <tr>
        <td><span class="error-code">\${code}</span></td>
        <td>\${count}</td>
        <td style="color:#a1a1aa">\${window._errorDescriptions?.[code] || ''}</td>
      </tr>
    \`).join('');
  } catch (e) { console.error('Fetch failed:', e); }
}

async function fetchErrorCodes() {
  try {
    const res = await fetch('/api/error-codes');
    window._errorDescriptions = await res.json();
  } catch (err) { console.error('Failed to fetch error codes:', err); }
}

async function refreshHealth() {
  await fetchStats();
}

// SSE live log stream
function connectStream() {
  const es = new EventSource('/api/stream');
  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'log') {
        logs.unshift(msg.data);
        if (logs.length > 500) logs.pop();
        renderLogs();
      }
    } catch (err) { console.error('Failed to process stream message:', err); }
  };
  es.onerror = () => {
    setTimeout(connectStream, 3000);
  };
}

fetchErrorCodes();
fetchStats();
setInterval(fetchStats, 5000);
connectStream();
</script>
</body>
</html>`;
}
