import type { Request, Response, NextFunction } from 'express';
import pool from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

export const getSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [rows] = (await pool.query('SELECT * FROM settings WHERE id = 1')) as unknown as [unknown[]];
    if (!rows || rows.length === 0) {
      throw new AppError(404, 'Settings record not found');
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    const allowed = ['week_start', 'currency_country', 'currency_code', 'currency_symbol', 'unit_position'] as const;

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }

    if (fields.length > 0) {
      await pool.query(`UPDATE settings SET ${fields.join(', ')} WHERE id = 1`, values);
    }

    const [rows] = (await pool.query('SELECT * FROM settings WHERE id = 1')) as unknown as [unknown[]];
    if (!rows || rows.length === 0) {
      throw new AppError(404, 'Settings record not found');
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};
