import type { Request, Response, NextFunction } from 'express';
import pool from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

export const getPaymentMethods = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [rows] = await pool.query('SELECT id, name, icon FROM payment_methods ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const createPaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, icon = 'credit-card' } = req.body;
    const [result] = (await pool.query(
      'INSERT INTO payment_methods (name, icon) VALUES (?, ?)',
      [name, icon],
    )) as unknown as [{ insertId: number }];

    const [rows] = (await pool.query('SELECT id, name, icon FROM payment_methods WHERE id = ?', [
      result.insertId,
    ])) as unknown as [unknown[]];
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updatePaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, icon } = req.body;
    const fields: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (icon !== undefined) {
      fields.push('icon = ?');
      values.push(icon);
    }

    if (fields.length > 0) {
      values.push(req.params.id);
      await pool.query(`UPDATE payment_methods SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = (await pool.query('SELECT id, name, icon FROM payment_methods WHERE id = ?', [
      req.params.id,
    ])) as unknown as [unknown[]];

    if (!rows || rows.length === 0) {
      throw new AppError(404, 'Payment method not found');
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const deletePaymentMethod = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [result] = (await pool.query('DELETE FROM payment_methods WHERE id = ?', [
      req.params.id,
    ])) as unknown as [{ affectedRows: number }];

    if (result.affectedRows === 0) {
      throw new AppError(404, 'Payment method not found');
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
