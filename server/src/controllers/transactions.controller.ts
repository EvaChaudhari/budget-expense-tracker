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
  payment_method_id?: number | null;
  user_id?: string | null;
  paid_for_member_id?: string | null;
}

const SELECT_TRANSACTION_SQL = `
  SELECT t.id, t.account_id, t.category_id, t.amount, t.note, t.description,
         DATE_FORMAT(t.tx_date, '%Y-%m-%d') AS tx_date,
         t.tx_time,
         t.payment_method_id,
         t.user_id AS userId,
         t.paid_for_member_id AS paidForMemberId,
         c.name AS category_name, c.icon AS category_icon,
         a.name AS account_name,
         pm.name AS payment_method_name, pm.icon AS payment_method_icon
  FROM transactions t
  JOIN categories c ON t.category_id = c.id
  JOIN accounts   a ON t.account_id  = a.id
  LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
`;

export const getTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { year, month, userId, paidForMemberId } = req.query;
    let sql = SELECT_TRANSACTION_SQL;
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (year !== undefined && year !== '') {
      conditions.push('YEAR(t.tx_date) = ?');
      params.push(Number(year));
      if (month !== undefined && month !== '') {
        conditions.push('MONTH(t.tx_date) = ?');
        params.push(Number(month));
      }
    }

    if (userId !== undefined && userId !== '') {
      conditions.push('(t.user_id = ? OR t.user_id IS NULL)');
      params.push(String(userId));
    }

    if (paidForMemberId !== undefined && paidForMemberId !== '') {
      conditions.push('t.paid_for_member_id = ?');
      params.push(String(paidForMemberId));
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY t.tx_date DESC, t.tx_time DESC, t.id DESC';
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
    const {
      account_id,
      category_id,
      amount,
      note,
      description,
      tx_date,
      tx_time,
      payment_method_id = null,
      userId = null,
      user_id = null,
      paidForMemberId = null,
      paid_for_member_id = null,
    } = req.body;

    const finalUserId = userId || user_id || 'user-1';
    const finalPaidFor = paidForMemberId || paid_for_member_id || null;

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
      `INSERT INTO transactions
         (account_id, category_id, amount, note, description, tx_date, tx_time, payment_method_id, user_id, paid_for_member_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        account_id,
        category_id,
        amount,
        note,
        description ?? null,
        tx_date,
        tx_time ?? '00:00:00',
        payment_method_id ?? null,
        finalUserId,
        finalPaidFor,
      ],
    )) as unknown as [{ insertId: number }];

    // Synchronize account balance atomically
    await conn.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
      amount,
      account_id,
    ]);

    // Retrieve full populated record
    const [rows] = (await conn.query(
      `${SELECT_TRANSACTION_SQL} WHERE t.id = ?`,
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
    const newPmId =
      'payment_method_id' in req.body ? (req.body.payment_method_id ?? null) : current.payment_method_id;
    const newUserId =
      req.body.userId || req.body.user_id || current.user_id || 'user-1';
    const newPaidFor =
      'paidForMemberId' in req.body
        ? req.body.paidForMemberId
        : 'paid_for_member_id' in req.body
        ? req.body.paid_for_member_id
        : current.paid_for_member_id;

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
      `UPDATE transactions
       SET account_id=?, category_id=?, amount=?, note=?, description=?, tx_date=?, tx_time=?,
           payment_method_id=?, user_id=?, paid_for_member_id=?
       WHERE id=?`,
      [
        newAccountId,
        newCategoryId,
        newAmount,
        newNote,
        newDescription,
        newTxDate,
        newTxTime,
        newPmId,
        newUserId,
        newPaidFor,
        req.params.id,
      ],
    );

    const [rows] = (await conn.query(
      `${SELECT_TRANSACTION_SQL} WHERE t.id = ?`,
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
