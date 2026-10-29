import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db/connection.js';

after(async () => {
  await pool.end();
});

test('Integration: Transaction Lifecycle & Account Balance Synchronization', async () => {
  // Baseline balance of account 1 (Cash)
  const [[initialAcc1]] = (await pool.query('SELECT balance FROM accounts WHERE id = 1')) as unknown as [[{ balance: number }]];
  const initialBalance = Number(initialAcc1.balance);

  // 1. Create a new transaction via API
  const createRes = await request(app)
    .post('/api/transactions')
    .send({
      account_id: 1,
      category_id: 6, // Food & Dining
      amount: -45.50,
      note: 'API Integration Test Coffee',
      description: '{"tag":"test","purpose":"dbs_verification"}',
      tx_date: '2026-06-25',
      tx_time: '14:30:00',
    });

  assert.equal(createRes.status, 201, 'Should return 201 Created');
  const txId = createRes.body.id;
  assert.ok(txId > 0, 'Should return valid inserted id');
  assert.equal(createRes.body.account_name, 'Cash');
  assert.equal(createRes.body.category_name, 'Food & Dining');

  // 2. Verify account balance in MySQL was decremented by 45.50
  const [[afterCreateAcc1]] = (await pool.query('SELECT balance FROM accounts WHERE id = 1')) as unknown as [[{ balance: number }]];
  assert.equal(
    Number(afterCreateAcc1.balance),
    Math.round((initialBalance - 45.50) * 100) / 100,
    'Account balance should be updated atomically in MySQL',
  );

  // 3. Update transaction: change amount from -45.50 to -50.00 and change note
  const updateRes = await request(app)
    .patch(`/api/transactions/${txId}`)
    .send({
      amount: -50.00,
      note: 'API Integration Test Coffee (Updated)',
    });

  assert.equal(updateRes.status, 200, 'Should return 200 OK');
  assert.equal(updateRes.body.amount, -50.00);
  assert.equal(updateRes.body.note, 'API Integration Test Coffee (Updated)');

  // 4. Verify account balance updated for difference (-4.50 more)
  const [[afterUpdateAcc1]] = (await pool.query('SELECT balance FROM accounts WHERE id = 1')) as unknown as [[{ balance: number }]];
  assert.equal(
    Number(afterUpdateAcc1.balance),
    Math.round((initialBalance - 50.00) * 100) / 100,
    'Account balance should reflect updated amount',
  );

  // 5. Delete transaction via API
  const deleteRes = await request(app).delete(`/api/transactions/${txId}`);
  assert.equal(deleteRes.status, 204, 'Should return 204 No Content');

  // 6. Verify account balance returned exactly to initial balance
  const [[finalAcc1]] = (await pool.query('SELECT balance FROM accounts WHERE id = 1')) as unknown as [[{ balance: number }]];
  assert.equal(
    Number(finalAcc1.balance),
    initialBalance,
    'Account balance should revert exactly to initial balance upon deletion',
  );

  // 7. Verify transaction record is deleted from MySQL
  const [[txCount]] = (await pool.query('SELECT COUNT(*) AS count FROM transactions WHERE id = ?', [txId])) as unknown as [[{ count: number }]];
  assert.equal(txCount.count, 0, 'Transaction must no longer exist in database');
});
