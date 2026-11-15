# DBS College Project: Postman Live Demonstration & Viva Guide

This guide provides a structured, step-by-step walkthrough to present the backend REST API, relational database constraints, and ACID transactions using **Postman** during your project presentation or lab viva.

---

## 1. Quick Setup & Import in Postman

We have included pre-configured Postman artifacts in the repository:
* **Collection File**: [`postman/Ledgr_DBS_Project.postman_collection.json`](../postman/Ledgr_DBS_Project.postman_collection.json)
* **Environment File**: [`postman/Ledgr_Local_Environment.postman_environment.json`](../postman/Ledgr_Local_Environment.postman_environment.json)

### How to Import:
1. Open the **Postman** desktop app (or web app).
2. Click the **Import** button in the top-left corner.
3. Drag & drop or select both files from the [`postman/`](../postman/) folder.
4. In the top-right corner environment dropdown, select **Ledgr Local Environment** (which sets `baseUrl` to `http://localhost:3001/api`).
5. Ensure your backend server is running:
   ```bash
   npm run dev --workspace=server
   ```
   *(Server starts on `http://localhost:3001`)*

---

## 2. Recommended Presentation Walkthrough (Step-by-Step)

The collection is organized into **10 logical folders** matching the requirements of an advanced Database Systems (DBS) course:

```
Ledgr DBS Project — Backend REST API
├── 01. System & Settings
├── 02. Categories
├── 03. Accounts & Groups
├── 04. Transactions & Double-Entry Ledger (ACID Showcase)
├── 05. Budgets & Overrides
├── 06. Statistics & Financial Analytics
├── 07. Payment Methods
├── 08. Recurring Rules & Automated Execution
├── 09. Family Members & Child Budgets
└── 10. Domain Invariants & DBS Error Handling (Crucial Viva Defense)
```

---

### Step 1: Health & Currency Configuration
* **Request**: `01. System & Settings > Health Check`
  * **Method**: `GET http://localhost:3001/api/health`
  * **Expected Status**: `200 OK`
  * **Talking Point**: Demonstrates server connectivity and operational uptime.
* **Request**: `01. System & Settings > Get User Settings`
  * **Expected Status**: `200 OK`
  * **Talking Point**: Stores regional user preferences, week start, and active currency symbols (INR `₹` / MYR).

---

### Step 2: Relational Categories & Liquidity Accounts
* **Request**: `02. Categories > List All Categories`
  * **Expected Status**: `200 OK`
  * **Talking Point**: Shows category classification partitioned by flow direction (`type = 'income' | 'expense'`) with unique constraint `uq_name_type`.
* **Request**: `03. Accounts & Groups > List All Accounts`
  * **Expected Status**: `200 OK`
  * **Talking Point**: Displays active liquidity accounts (Cash, Savings, Current, Credit Card, E-Wallet) categorized by `group_id` foreign key.

---

### Step 3: ACID Transaction & Balance Synchronization (The Core Highlight!)
Explain to the evaluator that our system maintains **double-entry ledger synchronization**:

1. **Check Starting Balance**:
   * Inspect Account 1 (`Cash`) balance (e.g. `₹ 1,240.00`).
2. **Execute Insertion**:
   * **Request**: `04. Transactions & Double-Entry Ledger > Create Transaction (ACID Balance Sync)`
   * **Method**: `POST /api/transactions`
   * **Payload**:
     ```json
     {
       "account_id": 1,
       "category_id": 6,
       "amount": -85.50,
       "note": "Team dinner at college cafe",
       "tx_date": "2026-11-15",
       "payment_method_id": 1,
       "userId": "user-1"
     }
     ```
   * **Expected Status**: `201 Created`
3. **Show Database Persistence**:
   * Call `03. Accounts & Groups > List All Accounts`.
   * **Result**: Account 1's balance immediately decremented by exactly `85.50` (`1,240.00 - 85.50 = 1,154.50`).
4. **Demonstrate Reversal**:
   * **Request**: `04. Transactions & Double-Entry Ledger > Delete Transaction`
   * **Expected Status**: `204 No Content`
   * Check Account 1 balance again: it is automatically restored to `1,240.00`!
   * **DBS Theory Point**: Both the transaction insertion/deletion and account balance update execute inside a single MySQL transaction (`START TRANSACTION`, row-locking `FOR UPDATE`, `COMMIT`, `ROLLBACK` on error).

---

### Step 4: Temporal Budgets & Overrides
* **Request**: `05. Budgets & Overrides > Get Budgets for Period`
  * **Query**: `?year=2026&month=6`
  * **Talking Point**: Effective monthly limit resolution. Default limits carry forward across months without duplicate rows, while specific months can have one-off overrides (`budget_overrides`).

---

### Step 5: Advanced Aggregations & Analytics
* **Request**: `06. Statistics & Financial Analytics > Monthly Income vs Expense Summary`
  * **Method**: `GET /api/stats/monthly`
  * **Expected Status**: `200 OK`
  * **Talking Point**: Complex SQL aggregation grouping by `YEAR(tx_date)` and `MONTH(tx_date)`, aggregating separate `SUM(CASE WHEN amount > 0 ...)` for income and expense columns.
* **Request**: `06. Statistics & Financial Analytics > Category Spending Breakdown`
  * **Query**: `?year=2026&month=6`
  * **Talking Point**: Multi-table relational join computing total spending per category for charts and variance analysis.

---

### Step 6: Automated Batch Processing for Recurring Payments
* **Request**: `08. Recurring Rules & Automated Execution > Process Due Recurring Payments`
  * **Method**: `POST /api/recurring/process`
  * **Expected Status**: `200 OK`
  * **Talking Point**: Batch processing job that queries `recurring_transactions` where `next_due_date <= CURDATE() AND active = 1`, logs real ledger transactions, updates account balances, and calculates future due dates (`INTERVAL 1 MONTH` / `1 WEEK`).

---

### Step 7: Domain Constraints & Error Handling (Crucial Viva Defense)
Show the professor that the API defends database integrity against illegal business states:

1. **Reject Budget on Income Category**:
   * **Request**: `10. Domain Invariants > Reject Budget on Income Category (400)`
   * **Response**: `400 Bad Request` — `{"error":"Budgets can only be set for expense categories"}`.
2. **Reject Cross-Flow Category Reassignment**:
   * **Request**: `10. Domain Invariants > Reject Cross-Flow Category Reassignment (400)`
   * **Response**: `400 Bad Request` — `{"error":"Cannot reassign transactions to a category of different flow type..."}`.
3. **Foreign Key `ON DELETE RESTRICT` Enforcement**:
   * **Request**: `10. Domain Invariants > Reject Account Deletion with Transactions (409)`
   * **Response**: `409 Conflict` — `{"error":"Cannot delete account because it has associated transactions"}`.
4. **Zod Input Schema Validation**:
   * **Request**: `10. Domain Invariants > Reject Invalid ID Path Parameter (400 Zod)`
   * **Response**: `400 Bad Request` — `{"error":"Validation error","details":{"id":["Expected number, received nan"]}}`.

---

## 3. Terminal Quick-Verification Commands

You can also run all backend tests directly from the terminal during the presentation:

```bash
# Run complete test suite (19 automated tests)
npm run test

# Run TypeScript compilation checks (0 errors)
npm run typecheck

# Run ESLint code quality checks (0 errors)
npm run lint

# Run production build (Vite client + Node server)
npm run build
```
