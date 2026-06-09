import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../middleware/validate';
import type { Request, Response, NextFunction } from 'express';

function createMockReq(body: any = {}, query: any = {}, params: any = {}) {
  return { body, query, params } as unknown as Request;
}

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null as any,
    status(code: number) { this.statusCode = code; return this; },
    json(data: any) { this.body = data; return this; },
  };
  return res as unknown as Response & { statusCode: number; body: any };
}

function createMockNext() {
  const calls: any[] = [];
  const next: NextFunction = (...args: any[]) => calls.push(args);
  return { next, calls };
}

describe('validateBody middleware', () => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  });

  it('passes valid body through', () => {
    const req = createMockReq({ name: 'John', email: 'john@test.com' });
    const res = createMockRes();
    const { next, calls } = createMockNext();

    validateBody(schema)(req, res, next);
    expect(calls.length).toBe(1);
    expect(req.body).toEqual({ name: 'John', email: 'john@test.com' });
  });

  it('returns 400 for invalid body', () => {
    const req = createMockReq({ name: '', email: 'bad' });
    const res = createMockRes();
    const { next, calls } = createMockNext();

    validateBody(schema)(req, res, next);
    expect(calls.length).toBe(0);
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();
  });

  it('strips unknown fields', () => {
    const req = createMockReq({ name: 'John', email: 'john@test.com', extra: 'removed' });
    const res = createMockRes();
    const { next } = createMockNext();

    validateBody(schema)(req, res, next);
    expect((req.body as any).extra).toBeUndefined();
  });
});

describe('validateQuery middleware', () => {
  const schema = z.object({
    page: z.string().optional(),
  });

  it('passes valid query', () => {
    const req = createMockReq({}, { page: '1' });
    const res = createMockRes();
    const { next, calls } = createMockNext();

    validateQuery(schema)(req, res, next);
    expect(calls.length).toBe(1);
  });
});

describe('validateParams middleware', () => {
  const schema = z.object({
    id: z.string().uuid(),
  });

  it('passes valid params', () => {
    const req = createMockReq({}, {}, { id: '550e8400-e29b-41d4-a716-446655440000' });
    const res = createMockRes();
    const { next, calls } = createMockNext();

    validateParams(schema)(req, res, next);
    expect(calls.length).toBe(1);
  });

  it('returns 400 for invalid UUID', () => {
    const req = createMockReq({}, {}, { id: 'not-a-uuid' });
    const res = createMockRes();
    const { next, calls } = createMockNext();

    validateParams(schema)(req, res, next);
    expect(calls.length).toBe(0);
    expect(res.statusCode).toBe(400);
  });
});
