import type { Request, Response, NextFunction } from 'express';
import pool from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

export const getCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY type, name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, type, icon } = req.body;
    const [result] = (await pool.query(
      'INSERT INTO categories (name, type, icon) VALUES (?, ?, ?)',
      [name, type, icon ?? 'tag'],
    )) as unknown as [{ insertId: number }];
    const [rows] = (await pool.query('SELECT * FROM categories WHERE id = ?', [
      result.insertId,
    ])) as unknown as [unknown[]];
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [existing] = (await pool.query('SELECT id FROM categories WHERE id = ?', [
      req.params.id,
    ])) as unknown as [unknown[]];
    if (!existing || existing.length === 0) {
      throw new AppError(404, 'Category not found');
    }

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
      await pool.query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = (await pool.query('SELECT * FROM categories WHERE id = ?', [
      req.params.id,
    ])) as unknown as [unknown[]];
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { reassignTo } = (req.body ?? {}) as { reassignTo?: number };

    const [existing] = (await conn.query('SELECT id FROM categories WHERE id = ?', [
      id,
    ])) as unknown as [unknown[]];
    if (!existing || existing.length === 0) {
      throw new AppError(404, 'Category not found');
    }

    if (reassignTo !== undefined) {
      if (Number(reassignTo) === Number(id)) {
        throw new AppError(400, 'Cannot reassign transactions to the category being deleted');
      }
      const [target] = (await conn.query('SELECT id FROM categories WHERE id = ?', [
        reassignTo,
      ])) as unknown as [unknown[]];
      if (!target || target.length === 0) {
        throw new AppError(400, 'Target category for reassignment does not exist');
      }

      await conn.beginTransaction();
      await conn.query('UPDATE transactions SET category_id = ? WHERE category_id = ?', [
        reassignTo,
        id,
      ]);
      await conn.query('DELETE FROM categories WHERE id = ?', [id]);
      await conn.commit();
      res.status(204).send();
    } else {
      const [[row]] = (await conn.query(
        'SELECT COUNT(*) AS count FROM transactions WHERE category_id = ?',
        [id],
      )) as unknown as [[{ count: number }]];
      if (row.count > 0) {
        res.status(409).json({ transactionCount: row.count });
        return;
      }
      await conn.query('DELETE FROM categories WHERE id = ?', [id]);
      res.status(204).send();
    }
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};
