import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { validateBody } from '../../middleware/validate';
import { loginSchema } from '../../schemas/auth';

describe('validate middleware', () => {
  const mockRes = () => {
    const res: any = {};
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (body: any) => { res.body = body; return res; };
    return res;
  };

  it('passes valid data through', () => {
    const req: any = { body: { email: 'user@example.com', password: 'test' } };
    const res = mockRes();
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    validateBody(loginSchema)(req, res, next);
    expect(nextCalled).toBe(true);
  });

  it('returns 400 for invalid data', () => {
    const req: any = { body: { email: 'bad', password: '' } };
    const res = mockRes();
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    validateBody(loginSchema)(req, res, next);
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.body).toBeDefined();
    expect(res.body.code).toBe('API_004');
    expect(res.body.meta.errors).toBeDefined();
  });

  it('strips unknown fields', () => {
    const req: any = { body: { email: 'user@example.com', password: 'test', extra: 'field' } };
    const res = mockRes();
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    validateBody(loginSchema)(req, res, next);
    expect(nextCalled).toBe(true);
    expect(req.body.extra).toBeUndefined();
  });
});
