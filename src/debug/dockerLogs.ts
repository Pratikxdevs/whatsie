/**
 * Docker Log Stream
 *
 * Streams logs from all Docker containers into the 9222 debug ring buffer
 * and pino logger. Enabled in all environments when DOCKER_LOGGING=true
 * (defaults to true in development, opt-in in production).
 */

import { spawn } from 'child_process';
import { logger } from '../config/logger';

const containers = ['crmv2-postgres', 'crmv2-redis', 'crmv2-evolution-api'];

const IS_ENABLED =
  process.env.DOCKER_LOGGING === 'true' ||
  (process.env.NODE_ENV !== 'production' && process.env.DOCKER_LOGGING !== 'false');

export function startDockerLogStream() {
  if (!IS_ENABLED) return;

  // addLog is imported lazily to avoid circular dep
  let addLogFn: ((level: string, msg: string, code?: string, meta?: Record<string, unknown>) => void) | null = null;
  try {
    addLogFn = require('./server').addLog;
  } catch { /* debug server not started yet */ }

  containers.forEach(container => {
    const p = spawn('docker', ['logs', '-f', '--tail', '20', container], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    p.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l: string) => l.trim().length > 0);
      lines.forEach((line: string) => {
        logger.info({ module: 'docker', container, category: 'docker' }, line);
        if (addLogFn) {
          addLogFn('info', `[DOCKER] ${container}: ${line.trim()}`, undefined, {
            source: 'docker',
            category: 'docker',
            container,
          });
        }
      });
    });

    p.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l: string) => l.trim().length > 0);
      lines.forEach((line: string) => {
        const isError = /error|fatal|exception/i.test(line);
        logger.warn({ module: 'docker', container, category: 'docker' }, line);
        if (addLogFn) {
          addLogFn(isError ? 'error' : 'warn', `[DOCKER] ${container}: ${line.trim()}`, undefined, {
            source: 'docker',
            category: 'docker',
            container,
          });
        }
      });
    });

    p.on('error', (err) => {
      logger.warn({ module: 'docker', container, err: err.message, category: 'docker' }, 'Docker log stream unavailable (container may not exist)');
      // Not fatal — Docker might not be running
    });

    p.on('close', (code) => {
      logger.debug({ module: 'docker', container, code, category: 'docker' }, 'Docker log stream closed');
      if (addLogFn) {
        addLogFn('warn', `[DOCKER] ${container} stream closed (code ${code})`, undefined, {
          source: 'docker',
          category: 'docker',
          container,
        });
      }
    });
  });
}
