import pino from 'pino';

// PII redaction patterns
const PHONE_RE = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const EMAIL_RE = /([a-zA-Z0-9._%+-]{1})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const API_KEY_RE = /(sk_[a-zA-Z0-9]{4})[a-zA-Z0-9]{20,}/g;

function redactPII(value: string): string {
  return value
    .replace(PHONE_RE, (m) => m.slice(0, -4) + '****')
    .replace(EMAIL_RE, '$1***@$2')
    .replace(API_KEY_RE, '$1****');
}

function redactObject(obj: any): any {
  if (typeof obj === 'string') return redactPII(obj);
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase().includes('key') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('token')) {
        result[k] = typeof v === 'string' ? v.slice(0, 4) + '****' : v;
      } else {
        result[k] = redactObject(v);
      }
    }
    return result;
  }
  return obj;
}

const isProd = process.env.NODE_ENV === 'production';

// Debug server ring buffer integration
let debugAddLog: ((level: string, msg: string, code?: string, meta?: Record<string, unknown>) => void) | null = null;

export function setDebugLogger(fn: typeof debugAddLog) {
  debugAddLog = fn;
}

export function getDebugLogger() {
  return debugAddLog;
}

const pinoOpts: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

const transport = isProd
  ? undefined
  : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } };

export const logger = transport
  ? pino({ ...pinoOpts, transport } as any)
  : pino(pinoOpts);

// Helper to also log to debug server
export function debugLog(level: string, msg: string, meta?: Record<string, unknown>) {
  if (debugAddLog) {
    debugAddLog(level, msg, undefined, meta);
  }
}

export function getContextLogger(tenantId: string, module: string, additionalContext: Record<string, any> = {}) {
  return logger.child({ tenantId, module, ...redactObject(additionalContext) });
}

export { redactPII, redactObject };
