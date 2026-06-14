import { spawn } from 'child_process';
import { logger } from '../config/logger';

const containers = ['crmv2-postgres', 'crmv2-redis', 'crmv2-evolution-api'];

export function startDockerLogStream() {
  if (process.env.NODE_ENV === 'production') return;

  containers.forEach(container => {
    // We run docker logs -f --tail 10
    const p = spawn('docker', ['logs', '-f', '--tail', '10', container]);

    p.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l: string) => l.trim().length > 0);
      lines.forEach((line: string) => {
        logger.info({ module: 'docker', container }, line);
      });
    });

    p.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l: string) => l.trim().length > 0);
      lines.forEach((line: string) => {
        logger.warn({ module: 'docker', container }, line);
      });
    });

    p.on('error', (err) => {
      logger.error({ module: 'docker', container, err: err.message }, 'Failed to stream docker logs');
    });

    p.on('close', (code) => {
      logger.debug({ module: 'docker', container, code }, 'Docker log stream closed');
    });
  });
}
