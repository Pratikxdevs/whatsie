import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { createAppError, ErrorCode } from '../errors/codes';

/**
 * Generic zod validation middleware factory.
 * Validates req.body against the provided schema.
 * Attaches parsed data to req.body (strips unknown fields).
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = formatZodError(result.error);
      return res.status(400).json(createAppError(ErrorCode.API_004, 'Validation failed', { errors }));
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validate req.query against a schema.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = formatZodError(result.error);
      return res.status(400).json(createAppError(ErrorCode.API_004, 'Validation failed', { errors }));
    }
    (req as any).query = result.data;
    next();
  };
}

/**
 * Validate req.params against a schema.
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errors = formatZodError(result.error);
      return res.status(400).json(createAppError(ErrorCode.API_004, 'Validation failed', { errors }));
    }
    (req as any).params = result.data;
    next();
  };
}

/**
 * Format ZodError into a flat array of { field, message } objects.
 */
function formatZodError(error: ZodError) {
  return error.issues.map(issue => ({
    field: issue.path.join('.') || '_root',
    message: issue.message,
  }));
}
