import type { Request, Response, NextFunction } from 'express';
import pool from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

interface DbTransaction {
  id: number;
  account_id: number;
  category_id: number;
  amount: number;
  note: string;
  description: string | null;
  tx_date: string;
  tx_time: string;
}

export const getTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { year, month } = req.query;
    let sql = `
      SELECT t.*, c.name AS category_name, c.icon AS category_icon, a.name AS account_name
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      JOIN accounts   a ON t.account_id  = a.id
    `;
    const params: (string | number)[] = [];
    if (year !== undefined && month !== undefined && year !== '' && month !== '') {
      sql += ' WHERE YEAR(t.tx_date) = ? AND MONTH(t.tx_date) = ?';
      params.push(Number(year), Number(month));
    }
    sql += ' ORDER BY t.tx_date DESC, t.tx_time DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const createTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    const { account_id, category_id, amount, note, description, tx_date, tx_time } = req.body;

    await conn.beginTransaction();

    // Verify account exists
    const [acc] = (await conn.query('SELECT id FROM accounts WHERE id = ? FOR UPDATE', [
      account_id,
    ])) as unknown as [unknown[]];
    if (!acc || acc.length === 0) {
      throw new AppError(400, 'Account not found');
    }

    // Verify category exists
    const [cat] = (await conn.query('SELECT id FROM categories WHERE id = ?', [
      category_id,
    ])) as unknown as [unknown[]];
    if (!cat || cat.length === 0) {
      throw new AppError(400, 'Category not found');
    }

    // Insert transaction
    const [result] = (await conn.query(
      'INSERT INTO transactions (account_id, category_id, amount, note, description, tx_date, tx_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [account_id, category_id, amount, note, description ?? null, tx_date, tx_time ?? '00:00:00'],
    )) as unknown as [{ insertId: number }];

    // Synchronize account balance atomically
    await conn.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
      amount,
      account_id,
    ]);

    // Retrieve full populated record
    const [rows] = (await conn.query(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, a.name AS account_name
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       JOIN accounts   a ON t.account_id  = a.id
       WHERE t.id = ?`,
      [result.insertId],
    )) as unknown as [unknown[]];

    await conn.commit();
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const updateTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = (await conn.query(
      'SELECT * FROM transactions WHERE id = ? FOR UPDATE',
      [req.params.id],
    )) as unknown as [DbTransaction[]];

    if (!existing || existing.length === 0) {
      throw new AppError(404, 'Transaction not found');
    }
    const current = existing[0];

    const newAccountId =
      req.body.account_id !== undefined ? req.body.account_id : current.account_id;
    const newCategoryId =
      req.body.category_id !== undefined ? req.body.category_id : current.category_id;
    const newAmount = req.body.amount !== undefined ? req.body.amount : current.amount;
    const newNote = req.body.note !== undefined ? req.body.note : current.note;
    const newDescription =
      'description' in req.body ? (req.body.description ?? null) : current.description;
    const newTxDate = req.body.tx_date !== undefined ? req.body.tx_date : current.tx_date;
    const newTxTime = req.body.tx_time !== undefined ? req.body.tx_time : current.tx_time;

    // Verify account exists if changed
    if (newAccountId !== current.account_id) {
      const [acc] = (await conn.query('SELECT id FROM accounts WHERE id = ? FOR UPDATE', [
        newAccountId,
      ])) as unknown as [unknown[]];
      if (!acc || acc.length === 0) {
        throw new AppError(400, 'Target account not found');
      }
    }

    // Verify category exists if changed
    if (newCategoryId !== current.category_id) {
      const [cat] = (await conn.query('SELECT id FROM categories WHERE id = ?', [
        newCategoryId,
      ])) as unknown as [unknown[]];
      if (!cat || cat.length === 0) {
        throw new AppError(400, 'Target category not found');
      }
    }

    // Rebalance accounts
    if (newAccountId === current.account_id) {
      const diff = newAmount - current.amount;
      if (diff !== 0) {
        await conn.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
          diff,
          current.account_id,
        ]);
      }
    } else {
      // Revert old account balance
      await conn.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [
        current.amount,
        current.account_id,
      ]);
      // Apply to new account balance
      await conn.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
        newAmount,
        newAccountId,
      ]);
    }

    await conn.query(
      'UPDATE transactions SET account_id=?, category_id=?, amount=?, note=?, description=?, tx_date=?, tx_time=? WHERE id=?',
      [
        newAccountId,
        newCategoryId,
        newAmount,
        newNote,
        newDescription,
        newTxDate,
        newTxTime,
        req.params.id,
      ],
    );

    const [rows] = (await conn.query(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, a.name AS account_name
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       JOIN accounts   a ON t.account_id  = a.id
       WHERE t.id = ?`,
      [req.params.id],
    )) as unknown as [unknown[]];

    await conn.commit();
    res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

export const deleteTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = (await conn.query(
      'SELECT account_id, amount FROM transactions WHERE id = ? FOR UPDATE',
      [req.params.id],
    )) as unknown as [{ account_id: number; amount: number }[]];

    if (!existing || existing.length === 0) {
      throw new AppError(404, 'Transaction not found');
    }
    const current = existing[0];

    // Atomically reverse amount from account balance
    await conn.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [
      current.amount,
      current.account_id,
    ]);
    await conn.query('DELETE FROM transactions WHERE id = ?', [req.params.id]);

    await conn.commit();
    res.status(204).send();
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};
