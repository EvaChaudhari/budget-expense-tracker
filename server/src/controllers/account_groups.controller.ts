import type { Request, Response, NextFunction } from 'express';
import pool from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

export const getAccountGroups = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [rows] = await pool.query('SELECT * FROM account_groups ORDER BY sort_order, name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const createAccountGroup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name } = req.body as { name: string };
    const [[{ maxOrder }]] = (await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM account_groups',
    )) as unknown as [[{ maxOrder: number }]];
    const [result] = (await pool.query(
      'INSERT INTO account_groups (name, sort_order) VALUES (?, ?)',
      [name, maxOrder + 1],
    )) as unknown as [{ insertId: number }];
    const [rows] = (await pool.query('SELECT * FROM account_groups WHERE id = ?', [
      result.insertId,
    ])) as unknown as [unknown[]];
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateAccountGroup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name } = req.body as { name: string };
    const [existing] = (await pool.query('SELECT id FROM account_groups WHERE id = ?', [
      req.params.id,
    ])) as unknown as [unknown[]];
    if (!existing || existing.length === 0) {
      throw new AppError(404, 'Account group not found');
    }

    await pool.query('UPDATE account_groups SET name = ? WHERE id = ?', [name, req.params.id]);
    const [rows] = (await pool.query('SELECT * FROM account_groups WHERE id = ?', [
      req.params.id,
    ])) as unknown as [unknown[]];
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const deleteAccountGroup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [existing] = (await pool.query('SELECT id FROM account_groups WHERE id = ?', [
      req.params.id,
    ])) as unknown as [unknown[]];
    if (!existing || existing.length === 0) {
      throw new AppError(404, 'Account group not found');
    }

    const [[{ count }]] = (await pool.query(
      'SELECT COUNT(*) AS count FROM accounts WHERE group_id = ?',
      [req.params.id],
    )) as unknown as [[{ count: number }]];
    if (count > 0) {
      res.status(409).json({ message: 'Group still has accounts assigned to it' });
      return;
    }
    await pool.query('DELETE FROM account_groups WHERE id = ?', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
