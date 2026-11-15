import type { Request, Response, NextFunction } from 'express';
import pool from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';

export const getFamilyMembers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req.query.userId as string) || 'user-1';
    const [rows] = await pool.query(
      `SELECT id, user_id AS userId, name, role, monthly_allowance AS monthlyAllowance, avatar, email
       FROM family_members
       WHERE user_id = ?
       ORDER BY role ASC, name ASC`,
      [userId],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

export const createFamilyMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id, userId = 'user-1', name, role, monthlyAllowance = 0, avatar, email } = req.body;
    const memberId = id || `member-${Date.now()}`;

    await pool.query(
      `INSERT INTO family_members (id, user_id, name, role, monthly_allowance, avatar, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [memberId, userId, name, role, monthlyAllowance, avatar || name.substring(0, 2).toUpperCase(), email || null],
    );

    const [rows] = (await pool.query(
      `SELECT id, user_id AS userId, name, role, monthly_allowance AS monthlyAllowance, avatar, email
       FROM family_members WHERE id = ?`,
      [memberId],
    )) as unknown as [unknown[]];

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

export const deleteFamilyMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const [result] = (await pool.query('DELETE FROM family_members WHERE id = ?', [
      req.params.id,
    ])) as unknown as [{ affectedRows: number }];

    if (result.affectedRows === 0) {
      throw new AppError(404, 'Family member not found');
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
