import type { Request, Response, NextFunction } from 'express';
import pool from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

export const getMonthlySummaries = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.query.userId as string | undefined;
    let sql = `
      SELECT
        YEAR(tx_date)  AS year,
        MONTH(tx_date) AS month,
        ROUND(COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0), 2)  AS income,
        ROUND(COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0), 2) AS expenses
      FROM transactions
    `;
    const params: unknown[] = [];
    if (userId) {
      sql += ' WHERE (user_id = ? OR user_id IS NULL)';
      params.push(userId);
    }
    sql += `
      GROUP BY YEAR(tx_date), MONTH(tx_date)
      ORDER BY year DESC, month DESC
      LIMIT 36
    `;
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const getCategoryBreakdown = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { year, month, userId } = req.query;
    if (!year) {
      throw new AppError(400, 'Year parameter is required');
    }

    const params: unknown[] = [Number(year)];
    let sql = `SELECT c.id, c.name, c.icon, c.type,
                      ROUND(SUM(ABS(t.amount)), 2) AS total
               FROM transactions t
               JOIN categories c ON t.category_id = c.id
               WHERE YEAR(t.tx_date) = ?`;

    if (month !== undefined && month !== '') {
      sql += ' AND MONTH(t.tx_date) = ?';
      params.push(Number(month));
    }

    if (userId !== undefined && userId !== '') {
      sql += ' AND (t.user_id = ? OR t.user_id IS NULL)';
      params.push(String(userId));
    }

    sql += ' GROUP BY c.id, c.name, c.icon, c.type ORDER BY c.type DESC, total DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};
