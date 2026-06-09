import { describe, it, expect } from 'vitest';
import {
  register,
  messagesReceivedTotal,
  messagesSentTotal,
  errorsTotal,
  httpRequestDurationSeconds,
  queueDepth,
} from './index';

describe('Prometheus Metrics', () => {
  it('exports register as a prom-client Registry', () => {
    expect(register).toBeDefined();
    expect(typeof register.metrics).toBe('function');
    expect(typeof register.contentType).toBe('string');
  });

  it('exports all counter metrics', () => {
    expect(messagesReceivedTotal).toBeDefined();
    expect(messagesSentTotal).toBeDefined();
    expect(errorsTotal).toBeDefined();
  });

  it('exports histogram metric', () => {
    expect(httpRequestDurationSeconds).toBeDefined();
  });

  it('exports gauge metric', () => {
    expect(queueDepth).toBeDefined();
  });

  it('collects default process metrics', async () => {
    const metrics = await register.metrics();
    expect(metrics).toContain('process_cpu_');
    expect(metrics).toContain('nodejs_');
  });

  it('includes custom metrics in output', async () => {
    // Increment a metric so it appears in output
    messagesReceivedTotal.inc({ platform: 'test', tenantId: 't1' });
    const metrics = await register.metrics();
    expect(metrics).toContain('messages_received_total');
  });
});
