import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import pool from '../src/db/connection.js';

after(async () => {
  await pool.end();
});

test('Database Connection & Configuration', async () => {
  const [rows] = (await pool.query('SELECT 1 AS connected')) as unknown as [[{ connected: number }]];
  assert.equal(rows[0].connected, 1, 'Database should be accessible');
});

test('Schema Baseline Row Counts', async () => {
  const [[settings]] = (await pool.query('SELECT COUNT(*) AS count FROM settings')) as unknown as [[{ count: number }]];
  const [[categories]] = (await pool.query('SELECT COUNT(*) AS count FROM categories')) as unknown as [[{ count: number }]];
  const [[groups]] = (await pool.query('SELECT COUNT(*) AS count FROM account_groups')) as unknown as [[{ count: number }]];
  const [[accounts]] = (await pool.query('SELECT COUNT(*) AS count FROM accounts')) as unknown as [[{ count: number }]];
  const [[defaults]] = (await pool.query('SELECT COUNT(*) AS count FROM budget_defaults')) as unknown as [[{ count: number }]];
  const [[txs]] = (await pool.query('SELECT COUNT(*) AS count FROM transactions')) as unknown as [[{ count: number }]];

  assert.equal(settings.count, 1, 'Settings baseline is 1');
  assert.equal(categories.count, 12, 'Categories baseline is 12');
  assert.equal(groups.count, 4, 'Account groups baseline is 4');
  assert.equal(accounts.count, 5, 'Accounts baseline is 5');
  assert.equal(defaults.count, 4, 'Budget defaults baseline is 4');
  assert.equal(txs.count, 126, 'Transactions baseline is 126');
});

test('TC-01: Foreign Key ON DELETE RESTRICT on Accounts', async () => {
  await assert.rejects(
    async () => {
      // Account 3 has transactions attached to it
      await pool.query('DELETE FROM accounts WHERE id = 3');
    },
    (err: any) => {
      return err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2';
    },
    'Should reject deleting an account that has transactions',
  );
});

test('TC-02: Foreign Key ON DELETE RESTRICT on Categories', async () => {
  await assert.rejects(
    async () => {
      // Category 6 has transactions attached to it
      await pool.query('DELETE FROM categories WHERE id = 6');
    },
    (err: any) => {
      return err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2';
    },
    'Should reject deleting a category that has transactions',
  );
});

test('TC-03: Unique Constraint on Categories (uq_name_type)', async () => {
  await assert.rejects(
    async () => {
      // Salary already exists as an income category
      await pool.query("INSERT INTO categories (name, type, icon) VALUES ('Salary', 'income', 'briefcase')");
    },
    (err: any) => {
      return err.errno === 1062 || err.code === 'ER_DUP_ENTRY';
    },
    'Should reject duplicate category with same name and type',
  );
});

test('TC-04: Unique Constraint on Budget Defaults (uq_cat_start)', async () => {
  await assert.rejects(
    async () => {
      // Category 6 already has default for 2026-6
      await pool.query(
        'INSERT INTO budget_defaults (category_id, start_year, start_month, amount) VALUES (6, 2026, 6, 99.00)',
      );
    },
    (err: any) => {
      return err.errno === 1062 || err.code === 'ER_DUP_ENTRY';
    },
    'Should reject duplicate start_year and start_month for category budget default',
  );
});

test('TC-05: Transaction Rollback Verification', async () => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "INSERT INTO transactions (account_id, category_id, amount, note, tx_date, tx_time) VALUES (1, 6, -99.99, 'Rollback Test', '2026-06-25', '12:00:00')",
    );
    const [[{ beforeRollback }]] = (await conn.query(
      "SELECT COUNT(*) AS beforeRollback FROM transactions WHERE note = 'Rollback Test'",
    )) as unknown as [[{ beforeRollback: number }]];
    assert.equal(beforeRollback, 1, 'Row should exist within transaction before rollback');

    await conn.rollback();

    const [[{ afterRollback }]] = (await pool.query(
      "SELECT COUNT(*) AS afterRollback FROM transactions WHERE note = 'Rollback Test'",
    )) as unknown as [[{ afterRollback: number }]];
    assert.equal(afterRollback, 0, 'Row should not exist after rollback');
  } finally {
    conn.release();
  }
});
