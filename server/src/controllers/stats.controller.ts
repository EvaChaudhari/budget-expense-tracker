import type { Request, Response, NextFunction } from 'express';
import pool from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

export const getMonthlySummaries = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [rows] = await pool.query(`
      SELECT
        YEAR(tx_date)  AS year,
        MONTH(tx_date) AS month,
        ROUND(COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0), 2)  AS income,
        ROUND(COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0), 2) AS expenses
      FROM transactions
      GROUP BY YEAR(tx_date), MONTH(tx_date)
      ORDER BY year DESC, month DESC
      LIMIT 36
    `);
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
    const { year, month } = req.query;
    if (!year) {
      throw new AppError(400, 'Year parameter is required');
    }

    const params: number[] = [Number(year)];
    let sql = `SELECT c.id, c.name, c.icon, c.type,
                      ROUND(SUM(ABS(t.amount)), 2) AS total
               FROM transactions t
               JOIN categories c ON t.category_id = c.id
               WHERE YEAR(t.tx_date) = ?`;

    if (month !== undefined && month !== '') {
      sql += ' AND MONTH(t.tx_date) = ?';
      params.push(Number(month));
    }

    sql += ' GROUP BY c.id, c.name, c.icon, c.type ORDER BY c.type DESC, total DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};
