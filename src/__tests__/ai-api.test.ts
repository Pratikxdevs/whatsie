import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTestToken } from './helpers';
import request from 'supertest';
import express from 'express';
import aiBridgeRouter from '../AiInteg/endpoints';
import axios from 'axios';

vi.mock('../queue/setup', () => ({
  redisConnection: {
    call: vi.fn().mockResolvedValue('OK'),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
  },
}));

vi.mock('../index', () => ({
  io: { to: vi.fn().mockReturnThis(), emit: vi.fn() },
}));

vi.mock('../config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  },
  setDebugLogger: vi.fn(),
}));

vi.mock('axios', async (importOriginal) => {
  const actual: any = await importOriginal();
  const mockInstance = {
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() }
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    default: {
      ...actual,
      create: vi.fn().mockReturnValue(mockInstance),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    }
  };
});

const app = express();
app.use(express.json());
app.use('/api/ai', aiBridgeRouter);

describe('AI API Endpoints', () => {
  const token = generateTestToken();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/ai/verify', () => {
    it('returns valid status and normalized models on successful validation', async () => {
      const mockKeyInfo = {
        data: {
          data: {
            limit: 50.0,
            usage: 12.5,
          }
        }
      };

      const mockModelsInfo = {
        data: {
          data: [
            {
              id: 'meta-llama/llama-3-70b',
              name: 'Llama 3 70B',
              context_length: 8192,
              pricing: {
                prompt: '0.00000059',
                completion: '0.00000079',
              }
            },
            {
              id: 'openai/gpt-4o',
              name: 'GPT-4o',
              context_length: 128000,
              pricing: {
                prompt: '0.000005',
                completion: '0.000015',
              }
            }
          ]
        }
      };

      vi.mocked(axios.get).mockImplementation((url) => {
        if (url.includes('/auth/key')) {
          return Promise.resolve(mockKeyInfo);
        }
        if (url.includes('/models')) {
          return Promise.resolve(mockModelsInfo);
        }
        return Promise.reject(new Error('Unknown url'));
      });

      const res = await request(app)
        .post('/api/ai/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ apiKey: 'sk-or-v1-testkey' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('valid');
      expect(res.body.credits).toBe(37.5);
      expect(res.body.availableModels).toHaveLength(2);
      expect(res.body.availableModels[0]).toEqual({
        id: 'meta-llama/llama-3-70b',
        name: 'Llama 3 70B',
        context_length: 8192,
        pricing: {
          prompt: '0.00000059',
          completion: '0.00000079'
        },
        providerSlug: 'meta-llama'
      });
    });

    it('returns status invalid for 401/403 rejected key check', async () => {
      const error401 = {
        response: { status: 401 },
        message: 'Request failed with status code 401'
      };

      vi.mocked(axios.get).mockImplementation((url) => {
        if (url.includes('/auth/key')) {
          return Promise.reject(error401);
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const res = await request(app)
        .post('/api/ai/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ apiKey: 'sk-or-v1-invalidkey' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('invalid');
      expect(res.body.credits).toBe(0);
      expect(res.body.availableModels).toEqual([]);
    });

    it('returns status no_credits if credits <= 0', async () => {
      const mockKeyInfo = {
        data: {
          data: {
            limit: 10.0,
            usage: 10.0,
          }
        }
      };

      vi.mocked(axios.get).mockImplementation((url) => {
        if (url.includes('/auth/key')) {
          return Promise.resolve(mockKeyInfo);
        }
        return Promise.resolve({ data: { data: [] } });
      });

      const res = await request(app)
        .post('/api/ai/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ apiKey: 'sk-or-v1-emptykey' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('no_credits');
      expect(res.body.credits).toBe(0);
      expect(res.body.availableModels).toEqual([]);
    });
  });
});
