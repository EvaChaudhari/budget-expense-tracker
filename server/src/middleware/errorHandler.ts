import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

interface MySQLError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.flatten().fieldErrors });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  const dbErr = err as MySQLError;
  if (dbErr && (dbErr.code || dbErr.errno)) {
    if (dbErr.code === 'ER_DUP_ENTRY' || dbErr.errno === 1062) {
      res.status(409).json({ error: 'Duplicate entry: A record with these unique details already exists.' });
      return;
    }
    if (dbErr.code === 'ER_ROW_IS_REFERENCED_2' || dbErr.errno === 1451) {
      res.status(409).json({ error: 'Referential integrity violation: Cannot delete or update record because dependent records exist.' });
      return;
    }
    if (dbErr.code === 'ER_NO_REFERENCED_ROW_2' || dbErr.errno === 1452) {
      res.status(400).json({ error: 'Invalid reference: The referenced account or category does not exist.' });
      return;
    }
  }

  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
};
