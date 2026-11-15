import type { Request, Response, NextFunction } from 'express';
import pool from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

export const getRecurring = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req.query.userId as string) || 'user-1';
    const [rows] = await pool.query(
      `SELECT id, user_id AS userId, title, amount, type, category, account_id AS accountId,
              frequency, DATE_FORMAT(next_due_date, '%Y-%m-%d') AS nextDueDate,
              active = 1 AS active, paid_for_member_id AS paidForMemberId
       FROM recurring_transactions
       WHERE user_id = ?
       ORDER BY next_due_date ASC, id ASC`,
      [userId],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const createRecurring = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      userId = 'user-1',
      title,
      amount,
      type,
      category,
      accountId,
      frequency = 'monthly',
      nextDueDate,
      active = true,
      paidForMemberId = null,
    } = req.body;

    const [result] = (await pool.query(
      `INSERT INTO recurring_transactions
         (user_id, title, amount, type, category, account_id, frequency, next_due_date, active, paid_for_member_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title,
        amount,
        type,
        category,
        accountId,
        frequency,
        nextDueDate,
        active ? 1 : 0,
        paidForMemberId,
      ],
    )) as unknown as [{ insertId: number }];

    const [rows] = (await pool.query(
      `SELECT id, user_id AS userId, title, amount, type, category, account_id AS accountId,
              frequency, DATE_FORMAT(next_due_date, '%Y-%m-%d') AS nextDueDate,
              active = 1 AS active, paid_for_member_id AS paidForMemberId
       FROM recurring_transactions
       WHERE id = ?`,
      [result.insertId],
    )) as unknown as [unknown[]];

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const updateRecurring = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const fields: string[] = [];
    const values: unknown[] = [];

    const {
      title,
      amount,
      type,
      category,
      accountId,
      frequency,
      nextDueDate,
      active,
      paidForMemberId,
    } = req.body;

    if (title !== undefined) {
      fields.push('title = ?');
      values.push(title);
    }
    if (amount !== undefined) {
      fields.push('amount = ?');
      values.push(amount);
    }
    if (type !== undefined) {
      fields.push('type = ?');
      values.push(type);
    }
    if (category !== undefined) {
      fields.push('category = ?');
      values.push(category);
    }
    if (accountId !== undefined) {
      fields.push('account_id = ?');
      values.push(accountId);
    }
    if (frequency !== undefined) {
      fields.push('frequency = ?');
      values.push(frequency);
    }
    if (nextDueDate !== undefined) {
      fields.push('next_due_date = ?');
      values.push(nextDueDate);
    }
    if (active !== undefined) {
      fields.push('active = ?');
      values.push(active ? 1 : 0);
    }
    if (paidForMemberId !== undefined) {
      fields.push('paid_for_member_id = ?');
      values.push(paidForMemberId);
    }

    if (fields.length > 0) {
      values.push(req.params.id);
      await pool.query(`UPDATE recurring_transactions SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    const [rows] = (await pool.query(
      `SELECT id, user_id AS userId, title, amount, type, category, account_id AS accountId,
              frequency, DATE_FORMAT(next_due_date, '%Y-%m-%d') AS nextDueDate,
              active = 1 AS active, paid_for_member_id AS paidForMemberId
       FROM recurring_transactions
       WHERE id = ?`,
      [req.params.id],
    )) as unknown as [unknown[]];

    if (!rows || rows.length === 0) {
      throw new AppError(404, 'Recurring transaction not found');
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const deleteRecurring = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [result] = (await pool.query('DELETE FROM recurring_transactions WHERE id = ?', [
      req.params.id,
    ])) as unknown as [{ affectedRows: number }];

    if (result.affectedRows === 0) {
      throw new AppError(404, 'Recurring transaction not found');
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const processDueRecurring = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const userId = (req.body.userId as string) || (req.query.userId as string) || 'user-1';

    const [dueItems] = (await conn.query(
      `SELECT r.*, DATE_FORMAT(r.next_due_date, '%Y-%m-%d') AS due_date_str
       FROM recurring_transactions r
       WHERE r.user_id = ? AND r.active = 1 AND r.next_due_date <= CURDATE()
       FOR UPDATE`,
      [userId],
    )) as unknown as [any[]];

    const processedTransactions: any[] = [];

    for (const item of dueItems) {
      // Find category id by name, fallback to 10 (Bills) or 1 (Salary)
      const [catRows] = (await conn.query(
        'SELECT id, name, icon FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1',
        [item.category],
      )) as unknown as [any[]];

      const categoryId = catRows.length > 0 ? catRows[0].id : (item.type === 'expense' ? 10 : 1);
      const categoryName = catRows.length > 0 ? catRows[0].name : item.category;
      const categoryIcon = catRows.length > 0 ? catRows[0].icon : (item.type === 'expense' ? 'receipt' : 'briefcase');

      const rawAmount = Math.abs(Number(item.amount));
      const signedAmount = item.type === 'expense' ? -rawAmount : rawAmount;

      const [txResult] = (await conn.query(
        `INSERT INTO transactions
           (account_id, category_id, amount, note, description, tx_date, tx_time, user_id, paid_for_member_id)
         VALUES (?, ?, ?, ?, ?, ?, '09:00:00', ?, ?)`,
        [
          item.account_id,
          categoryId,
          signedAmount,
          item.title,
          `Automated recurring ${item.frequency} payment`,
          item.due_date_str,
          item.user_id,
          item.paid_for_member_id,
        ],
      )) as unknown as [{ insertId: number }];

      // Update account balance
      await conn.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
        signedAmount,
        item.account_id,
      ]);

      // Calculate next due date
      let intervalSql = 'INTERVAL 1 MONTH';
      if (item.frequency === 'weekly') intervalSql = 'INTERVAL 1 WEEK';
      else if (item.frequency === 'yearly') intervalSql = 'INTERVAL 1 YEAR';

      await conn.query(
        `UPDATE recurring_transactions
         SET next_due_date = DATE_ADD(next_due_date, ${intervalSql})
         WHERE id = ?`,
        [item.id],
      );

      const [accRows] = (await conn.query('SELECT name FROM accounts WHERE id = ?', [
        item.account_id,
      ])) as unknown as [any[]];

      processedTransactions.push({
        id: txResult.insertId,
        account_id: item.account_id,
        category_id: categoryId,
        amount: signedAmount,
        note: item.title,
        description: `Automated recurring ${item.frequency} payment`,
        tx_date: item.due_date_str,
        tx_time: '09:00:00',
        category_name: categoryName,
        category_icon: categoryIcon,
        account_name: accRows[0]?.name || 'Account',
        userId: item.user_id,
        paidForMemberId: item.paid_for_member_id,
      });
    }

    await conn.commit();
    res.json({
      processed: processedTransactions.length,
      transactions: processedTransactions,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};
