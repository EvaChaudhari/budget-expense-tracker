import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/index.js';
import pool from '../src/db/connection.js';

after(async () => {
  await pool.end();
});

test('API: Health Check', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');

  const apiRes = await request(app).get('/api/health');
  assert.equal(apiRes.status, 200);
  assert.equal(apiRes.body.status, 'ok');
});

test('API: Settings endpoints (GET & PATCH)', async () => {
  const getRes = await request(app).get('/api/settings');
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.currency_code, 'MYR');

  // Test partial patch
  const patchRes = await request(app)
    .patch('/api/settings')
    .send({ currency_country: 'Malaysia - DBS Test' });
  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.currency_country, 'Malaysia - DBS Test');

  // Revert back
  const revertRes = await request(app)
    .patch('/api/settings')
    .send({ currency_country: 'Malaysia' });
  assert.equal(revertRes.status, 200);
  assert.equal(revertRes.body.currency_country, 'Malaysia');
});

test('API: Categories CRUD and Conflict Detection', async () => {
  // 1. GET categories
  const getRes = await request(app).get('/api/categories');
  assert.equal(getRes.status, 200);
  assert.ok(Array.isArray(getRes.body));

  // 2. POST create temporary category
  const createRes = await request(app)
    .post('/api/categories')
    .send({ name: 'Z_TestCategory', type: 'expense', icon: 'tag' });
  assert.equal(createRes.status, 201);
  const testCatId = createRes.body.id;
  assert.ok(testCatId > 0);

  // 3. POST duplicate category -> 409
  const dupRes = await request(app)
    .post('/api/categories')
    .send({ name: 'Z_TestCategory', type: 'expense', icon: 'tag' });
  assert.equal(dupRes.status, 409);

  // 4. PATCH category
  const patchRes = await request(app)
    .patch(`/api/categories/${testCatId}`)
    .send({ name: 'Z_TestCategory_Updated' });
  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.name, 'Z_TestCategory_Updated');

  // 5. DELETE unreferenced category -> 204
  const delRes = await request(app).delete(`/api/categories/${testCatId}`);
  assert.equal(delRes.status, 204);

  // 6. DELETE referenced category without reassignment -> 409 with transactionCount
  const refDelRes = await request(app).delete('/api/categories/6');
  assert.equal(refDelRes.status, 409);
  assert.ok(refDelRes.body.transactionCount > 0);
});

test('API: Account Groups CRUD and Constraints', async () => {
  // 1. GET groups
  const getRes = await request(app).get('/api/account-groups');
  assert.equal(getRes.status, 200);

  // 2. POST create group
  const createRes = await request(app)
    .post('/api/account-groups')
    .send({ name: 'Z_TestGroup' });
  assert.equal(createRes.status, 201);
  const groupId = createRes.body.id;

  // 3. PATCH group
  const patchRes = await request(app)
    .patch(`/api/account-groups/${groupId}`)
    .send({ name: 'Z_TestGroup_Renamed' });
  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.name, 'Z_TestGroup_Renamed');

  // 4. DELETE group
  const delRes = await request(app).delete(`/api/account-groups/${groupId}`);
  assert.equal(delRes.status, 204);

  // 5. Attempt delete group with assigned accounts (group 1) -> 409
  const inUseRes = await request(app).delete('/api/account-groups/1');
  assert.equal(inUseRes.status, 409);
});

test('API: Accounts CRUD and Constraints', async () => {
  // 1. GET accounts
  const getRes = await request(app).get('/api/accounts');
  assert.equal(getRes.status, 200);

  // 2. POST create test account
  const createRes = await request(app)
    .post('/api/accounts')
    .send({
      name: 'Z_TestSavings',
      type: 'Savings',
      icon: 'piggy-bank',
      color: '#3b82f6',
      balance: 500.00,
      group_id: 2,
    });
  assert.equal(createRes.status, 201);
  const accId = createRes.body.id;

  // 3. PATCH account
  const patchRes = await request(app)
    .patch(`/api/accounts/${accId}`)
    .send({ name: 'Z_TestSavings_Renamed', balance: 550.00 });
  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.name, 'Z_TestSavings_Renamed');
  assert.equal(patchRes.body.balance, 550.00);

  // 4. DELETE account
  const delRes = await request(app).delete(`/api/accounts/${accId}`);
  assert.equal(delRes.status, 204);

  // 5. DELETE referenced account (account 3) -> 409
  const blockedDel = await request(app).delete('/api/accounts/3');
  assert.equal(blockedDel.status, 409);
});

test('API: Budgets and Monthly Overrides', async () => {
  // 1. GET budgets for June 2026
  const getRes = await request(app).get('/api/budgets?year=2026&month=6');
  assert.equal(getRes.status, 200);
  assert.ok(Array.isArray(getRes.body));

  // 2. PUT override for Food & Dining (category 6) in month 6
  const putRes = await request(app)
    .put('/api/budgets/6/override/2026/6')
    .send({ amount: 120.00 });
  assert.equal(putRes.status, 204);

  // 3. GET verify override took effect
  const verifyRes = await request(app).get('/api/budgets?year=2026&month=6');
  const cat6 = verifyRes.body.find((b: any) => b.category_id === 6);
  assert.equal(cat6.override_amount, 120.00);

  // 4. DELETE override
  const delRes = await request(app).delete('/api/budgets/6/override/2026/6');
  assert.equal(delRes.status, 204);

  // 5. GET verify override is cleared
  const checkRes = await request(app).get('/api/budgets?year=2026&month=6');
  const cat6After = checkRes.body.find((b: any) => b.category_id === 6);
  assert.equal(cat6After.override_amount, null);
});

test('API: Stats Monthly & Categories', async () => {
  const monthlyRes = await request(app).get('/api/stats/monthly');
  assert.equal(monthlyRes.status, 200);
  assert.ok(Array.isArray(monthlyRes.body));
  assert.ok(monthlyRes.body.length > 0);

  const catRes = await request(app).get('/api/stats/categories?year=2026&month=5');
  assert.equal(catRes.status, 200);
  assert.ok(Array.isArray(catRes.body));
});

test('API: Transactions Validation & Missing Resource Handling', async () => {
  // Invalid body -> 400
  const invalidRes = await request(app).post('/api/transactions').send({
    account_id: 'invalid',
    amount: 'not-a-number',
  });
  assert.equal(invalidRes.status, 400);

  // Missing transaction -> 404
  const notFoundRes = await request(app).delete('/api/transactions/999999');
  assert.equal(notFoundRes.status, 404);
});
