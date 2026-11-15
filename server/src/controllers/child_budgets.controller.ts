import type { Request, Response, NextFunction } from 'express';
import pool from '../db/connection.js';

export const getChildBudgets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req.query.userId as string) || 'user-1';
    const memberId = req.query.memberId as string | undefined;

    let query = `
      SELECT member_id AS memberId, category_id AS categoryId, amount
      FROM child_budget_limits
      WHERE user_id = ?
    `;
    const params: unknown[] = [userId];

    if (memberId) {
      query += ' AND member_id = ?';
      params.push(memberId);
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const upsertChildBudget = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { memberId, categoryId } = req.params;
    const { amount, userId = 'user-1' } = req.body;

    await pool.query(
      `INSERT INTO child_budget_limits (user_id, member_id, category_id, amount)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), user_id = VALUES(user_id)`,
      [userId, memberId, categoryId, amount],
    );

    res.json({
      memberId,
      categoryId: Number(categoryId),
      amount: Number(amount),
    });
  } catch (err) {
    next(err);
  }
};

export const deleteChildBudget = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { memberId, categoryId } = req.params;
    await pool.query(
      'DELETE FROM child_budget_limits WHERE member_id = ? AND category_id = ?',
      [memberId, categoryId],
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
