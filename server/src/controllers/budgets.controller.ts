import type { Request, Response, NextFunction } from 'express';
import pool from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

// Returns all expense categories with their effective default + current-month override.
// default_amount = most recent default whose start_date <= (year, month); null if none.
// override_amount = month-specific override if set; null otherwise.
export const getBudgets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const y = Number(req.query.year);
    const m = Number(req.query.month);
    if (!y || !m || m < 1 || m > 12) {
      throw new AppError(400, 'Valid year and month (1-12) query parameters are required');
    }

    const [rows] = await pool.query(
      `SELECT
        c.id AS category_id,
        (SELECT d.amount FROM budget_defaults d
         WHERE d.category_id = c.id
           AND (d.start_year < ? OR (d.start_year = ? AND d.start_month <= ?))
         ORDER BY d.start_year DESC, d.start_month DESC LIMIT 1) AS default_amount,
        o.amount AS override_amount
       FROM categories c
       LEFT JOIN budget_overrides o ON o.category_id = c.id AND o.year = ? AND o.month = ?
       WHERE c.type = 'expense'`,
      [y, y, m, y, m],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// Upsert a default entry starting from the given (year, month).
export const upsertDefault = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { categoryId } = req.params;
    const { year, month, amount } = req.body;

    const [cat] = (await pool.query('SELECT id, type FROM categories WHERE id = ?', [
      categoryId,
    ])) as unknown as [{ id: number; type: string }[]];
    if (!cat || cat.length === 0) {
      throw new AppError(404, 'Category not found');
    }

    await pool.query(
      `INSERT INTO budget_defaults (category_id, start_year, start_month, amount)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      [categoryId, year, month, amount],
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Removes all defaults + overrides for this category (full reset).
export const removeAllBudgets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const { categoryId } = req.params;
    const [cat] = (await conn.query('SELECT id FROM categories WHERE id = ?', [
      categoryId,
    ])) as unknown as [unknown[]];
    if (!cat || cat.length === 0) {
      throw new AppError(404, 'Category not found');
    }

    await conn.beginTransaction();
    await conn.query('DELETE FROM budget_defaults WHERE category_id = ?', [categoryId]);
    await conn.query('DELETE FROM budget_overrides WHERE category_id = ?', [categoryId]);
    await conn.commit();
    res.status(204).send();
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const upsertOverride = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { categoryId, year, month } = req.params;
    const { amount } = req.body;

    const [cat] = (await pool.query('SELECT id FROM categories WHERE id = ?', [
      categoryId,
    ])) as unknown as [unknown[]];
    if (!cat || cat.length === 0) {
      throw new AppError(404, 'Category not found');
    }

    await pool.query(
      `INSERT INTO budget_overrides (category_id, year, month, amount)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      [categoryId, year, month, amount],
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const deleteOverride = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { categoryId, year, month } = req.params;
    await pool.query(
      'DELETE FROM budget_overrides WHERE category_id = ? AND year = ? AND month = ?',
      [categoryId, year, month],
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
