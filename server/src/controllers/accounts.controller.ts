import type { Request, Response, NextFunction } from 'express';
import pool from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

export const getAccounts = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM accounts ORDER BY group_id IS NULL, group_id, name',
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const createAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, type, icon, color, balance, group_id } = req.body as {
      name: string;
      type: string;
      icon?: string;
      color?: string;
      balance?: number;
      group_id?: number | null;
    };
    const [result] = (await pool.query(
      'INSERT INTO accounts (name, type, icon, color, balance, group_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, type, icon ?? 'wallet', color ?? '#2563eb', balance ?? 0, group_id ?? null],
    )) as unknown as [{ insertId: number }];
    const [rows] = (await pool.query('SELECT * FROM accounts WHERE id = ?', [
      result.insertId,
    ])) as unknown as [unknown[]];
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [existing] = (await pool.query('SELECT id FROM accounts WHERE id = ?', [
      req.params.id,
    ])) as unknown as [unknown[]];
    if (!existing || existing.length === 0) {
      throw new AppError(404, 'Account not found');
    }

    const { name, type, icon, color, balance, group_id } = req.body as {
      name?: string;
      type?: string;
      icon?: string;
      color?: string;
      balance?: number;
      group_id?: number | null;
    };
    const fields: string[] = [];
    const values: unknown[] = [];
    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (type !== undefined) {
      fields.push('type = ?');
      values.push(type);
    }
    if (icon !== undefined) {
      fields.push('icon = ?');
      values.push(icon);
    }
    if (color !== undefined) {
      fields.push('color = ?');
      values.push(color);
    }
    if (balance !== undefined) {
      fields.push('balance = ?');
      values.push(balance);
    }
    if ('group_id' in req.body) {
      fields.push('group_id = ?');
      values.push(group_id ?? null);
    }
    if (fields.length > 0) {
      values.push(req.params.id);
      await pool.query(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    const [rows] = (await pool.query('SELECT * FROM accounts WHERE id = ?', [
      req.params.id,
    ])) as unknown as [unknown[]];
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [existing] = (await pool.query('SELECT id FROM accounts WHERE id = ?', [
      req.params.id,
    ])) as unknown as [unknown[]];
    if (!existing || existing.length === 0) {
      throw new AppError(404, 'Account not found');
    }

    const [[{ count }]] = (await pool.query(
      'SELECT COUNT(*) AS count FROM transactions WHERE account_id = ?',
      [req.params.id],
    )) as unknown as [[{ count: number }]];
    if (count > 0) {
      throw new AppError(409, 'Cannot delete account because it has associated transactions');
    }

    await pool.query('DELETE FROM accounts WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
