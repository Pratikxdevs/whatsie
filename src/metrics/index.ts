import promClient from 'prom-client';

// Create a custom registry
export const register = new promClient.Registry();

// Collect default metrics (process, GC, event loop, etc.)
promClient.collectDefaultMetrics({ register });

// Counters
export const messagesReceivedTotal = new promClient.Counter({
  name: 'messages_received_total',
  help: 'Total number of messages received',
  labelNames: ['platform', 'tenantId'],
  registers: [register]
});

export const messagesSentTotal = new promClient.Counter({
  name: 'messages_sent_total',
  help: 'Total number of messages sent',
  labelNames: ['platform', 'tenantId'],
  registers: [register]
});

export const errorsTotal = new promClient.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['route', 'method', 'status'],
  registers: [register]
});

// Histograms
export const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// Gauges
export const queueDepth = new promClient.Gauge({
  name: 'queue_depth',
  help: 'Current depth of message queues',
  labelNames: ['queue_name'],
  registers: [register]
});

// Telemetry & Security Auditing
export const apiRateLimitHitsTotal = new promClient.Counter({
  name: 'api_rate_limit_hits_total',
  help: 'Total number of rate limit rejections triggered by the security boundary',
  labelNames: ['route', 'ip'],
  registers: [register]
});

export const aiTokenUsageTotal = new promClient.Counter({
  name: 'ai_token_usage_total',
  help: 'Total number of AI tokens consumed across the platform',
  labelNames: ['tenantId', 'model', 'type'], // type: 'prompt' or 'completion'
  registers: [register]
});

export const webhookFailuresTotal = new promClient.Counter({
  name: 'webhook_failures_total',
  help: 'Total number of webhook deliveries that failed validation or threw an exception',
  labelNames: ['platform', 'reason'],
  registers: [register]
});


