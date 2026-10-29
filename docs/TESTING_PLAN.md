# Database Testing Plan & Verification Suite: `ledgr` Database

**Target Database**: `ledgr` (MySQL 8.4)  
**Academic Module**: Database Systems (DBS)  
**Scope**: Verification of relational integrity, foreign key actions, domain constraints, baseline datasets, and query reproducibility.

---

## 1. Test Environment and Baseline Preconditions

The `ledgr` database is initialized from [`server/src/db/schema.sql`](file:///Users/evariteshkumarchaudhari/Desktop/projects/budget-tracker/server/src/db/schema.sql). The testing suite relies on the known baseline data state documented below.

### Known Baseline State (Ground Truth):
* **`settings`**: Exactly 1 record (`id = 1`, `currency_code = 'MYR'`, `currency_symbol = 'RM'`, `week_start = 'Sunday'`).
* **`account_groups`**: Exactly 4 records (`Cash`, `Bank`, `Card`, `E-wallet`).
* **`accounts`**: Exactly 5 accounts:
  * `id = 1`: Cash (`RM 1240.00`, group 1)
  * `id = 2`: Maybank Savings (`RM 18500.00`, group 2)
  * `id = 3`: CIMB Current (`RM 4320.50`, group 2)
  * `id = 4`: Touch 'n Go (`RM 380.00`, group 4)
  * `id = 5`: Maybank Credit (`RM -1150.00`, group 3)
* **`categories`**: Exactly 12 categories (5 income, 7 expense):
  * *Income*: Salary (1), Freelance (2), Investment (3), Gift (4), Refund (5).
  * *Expense*: Food & Dining (6), Transport (7), Shopping (8), Groceries (9), Bills (10), Entertainment (11), Health (12).
* **`budget_defaults`**: Exactly 4 default limits effective June 2026:
  * Food & Dining (6): RM 20.00
  * Transport (7): RM 40.00
  * Groceries (9): RM 50.00
  * Entertainment (11): RM 150.00
* **`budget_overrides`**: 0 initial records.
* **`transactions`**: Exactly **126 records** spanning January 3, 2025 to June 17, 2026.

---

## 2. Integrity Constraint Test Cases

The following test cases verify that the MySQL storage engine actively enforces the integrity constraints defined in the relational schema.

### Test Case TC-01: Referential Integrity on Account Deletion (`ON DELETE RESTRICT`)
* **Objective**: Verify that accounts referenced by existing transactions cannot be dropped.
* **Execution SQL**:
  ```sql
  DELETE FROM accounts WHERE id = 3;
  ```
* **Expected Result**: **FAIL (Error 1451)**
  `ERROR 1451 (23000): Cannot delete or update a parent row: a foreign key constraint fails (fk_tx_account)`
* **Academic Rationale**: Guarantees ledger auditability by preventing the deletion of accounts with historical cash flows.

---

### Test Case TC-02: Referential Integrity on Category Deletion (`ON DELETE RESTRICT`)
* **Objective**: Verify that categories referenced by transactions cannot be deleted.
* **Execution SQL**:
  ```sql
  DELETE FROM categories WHERE id = 6;
  ```
* **Expected Result**: **FAIL (Error 1451)**
  `ERROR 1451 (23000): Cannot delete or update a parent row: a foreign key constraint fails (fk_tx_category)`
* **Academic Rationale**: Prevents orphan transactions that lack classification.

---

### Test Case TC-03: Unique Key Constraint Enforcement on `categories` (`uq_name_type`)
* **Objective**: Verify that duplicate category names cannot be inserted within the same flow direction.
* **Execution SQL**:
  ```sql
  INSERT INTO categories (name, type, icon) VALUES ('Salary', 'income', 'briefcase');
  ```
* **Expected Result**: **FAIL (Error 1062)**
  `ERROR 1062 (23000): Duplicate entry 'Salary-income' for key 'categories.uq_name_type'`
* **Academic Rationale**: Enforces entity integrity by prohibiting redundant classifications.

---

### Test Case TC-04: Unique Key Constraint Enforcement on `budget_defaults` (`uq_cat_start`)
* **Objective**: Verify that only one default limit can be set for a category starting in the same month.
* **Execution SQL**:
  ```sql
  INSERT INTO budget_defaults (category_id, start_year, start_month, amount) 
  VALUES (6, 2026, 6, 99.00);
  ```
* **Expected Result**: **FAIL (Error 1062)**
  `ERROR 1062 (23000): Duplicate entry '6-2026-6' for key 'budget_defaults.uq_cat_start'`
* **Academic Rationale**: Enforces functional dependency $\{category\_id, start\_year, start\_month\} \rightarrow \{amount\}$.

---

### Test Case TC-05: Cascading Deletes on `budget_defaults` (`ON DELETE CASCADE`)
* **Objective**: Verify that deleting an unreferenced category automatically cascades to remove its budget records.
* **Execution SQL (Safe Transaction Demo)**:
  ```sql
  START TRANSACTION;
  -- Insert temporary category and default budget
  INSERT INTO categories (id, name, type, icon) VALUES (999, 'Temp Cat', 'expense', 'tag');
  INSERT INTO budget_defaults (category_id, start_year, start_month, amount) VALUES (999, 2026, 7, 50.00);

  -- Delete category
  DELETE FROM categories WHERE id = 999;

  -- Confirm cascading deletion in budget_defaults
  SELECT COUNT(*) AS remaining_defaults FROM budget_defaults WHERE category_id = 999;
  ROLLBACK;
  ```
* **Expected Result**: `remaining_defaults = 0`.
* **Academic Rationale**: Ensures clean cleanup of dependent weak entity records.

---

### Test Case TC-06: `ON DELETE SET NULL` on `accounts.group_id`
* **Objective**: Verify that deleting an account group unlinks the associated account without deleting the account.
* **Execution SQL (Safe Transaction Demo)**:
  ```sql
  START TRANSACTION;
  -- Insert temporary group and associate an account
  INSERT INTO account_groups (id, name, sort_order) VALUES (999, 'Test Group', 99);
  UPDATE accounts SET group_id = 999 WHERE id = 1;

  -- Delete group
  DELETE FROM account_groups WHERE id = 999;

  -- Verify account still exists with group_id NULL
  SELECT id, name, group_id FROM accounts WHERE id = 1;
  ROLLBACK;
  ```
* **Expected Result**: Account 1 remains intact with `group_id = NULL`.

---

## 3. Query Result Verification & Quantitative Assertions

The following table provides verified baseline quantitative results against the seeded dataset in MySQL 8.4.

| Test ID | Metric / Description | SQL Assertion Query | Expected Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Q-01** | Total Seeded Transactions | `SELECT COUNT(*) FROM transactions;` | `126` | PASS |
| **Q-02** | Total Distinct Accounts | `SELECT COUNT(*) FROM accounts;` | `5` | PASS |
| **Q-03** | Total Distinct Categories | `SELECT COUNT(*) FROM categories;` | `12` | PASS |
| **Q-04** | Total Account Groups | `SELECT COUNT(*) FROM account_groups;` | `4` | PASS |
| **Q-05** | Lifetime Income Transactions Count | `SELECT COUNT(*) FROM transactions WHERE amount > 0;` | `26` | PASS |
| **Q-06** | Lifetime Expense Transactions Count| `SELECT COUNT(*) FROM transactions WHERE amount < 0;` | `100` | PASS |
| **Q-07** | Earliest Transaction Recorded | `SELECT MIN(tx_date) FROM transactions;` | `2025-01-03` | PASS |
| **Q-08** | Latest Transaction Recorded | `SELECT MAX(tx_date) FROM transactions;` | `2026-06-17` | PASS |
| **Q-09** | Lifetime Cumulative Income Sum | `SELECT SUM(amount) FROM transactions WHERE amount > 0;` | `105100.00` | PASS |
| **Q-10** | Lifetime Cumulative Expense Sum | `SELECT SUM(ABS(amount)) FROM transactions WHERE amount < 0;` | `22384.70` | PASS |
| **Q-11** | May 2026 Salary Transaction | `SELECT amount FROM transactions WHERE id = 120;` | `5200.00` | PASS |
| **Q-12** | Settings Singleton Constraint | `SELECT COUNT(*) FROM settings;` | `1` | PASS |

---

## 4. Automated SQL Assertion Script

The following script can be executed in MySQL Workbench, phpMyAdmin, or via the MySQL CLI. It executes non-destructive relational checks and outputs a formal validation report.

```sql
USE ledgr;

SELECT '===================================================' AS test_banner;
SELECT 'LEDGR DATABASE SYSTEMS: AUTOMATED TEST SUITE' AS test_banner;
SELECT '===================================================' AS test_banner;

SELECT 
    'TC-Q01: Transactions Count' AS test_case,
    CASE WHEN COUNT(*) = 126 THEN 'PASS' ELSE 'FAIL' END AS result,
    COUNT(*) AS actual_value,
    126 AS expected_value
FROM transactions
UNION ALL
SELECT 
    'TC-Q02: Accounts Count' AS test_case,
    CASE WHEN COUNT(*) = 5 THEN 'PASS' ELSE 'FAIL' END AS result,
    COUNT(*) AS actual_value,
    5 AS expected_value
FROM accounts
UNION ALL
SELECT 
    'TC-Q03: Categories Count' AS test_case,
    CASE WHEN COUNT(*) = 12 THEN 'PASS' ELSE 'FAIL' END AS result,
    COUNT(*) AS actual_value,
    12 AS expected_value
FROM categories
UNION ALL
SELECT 
    'TC-Q04: Account Groups Count' AS test_case,
    CASE WHEN COUNT(*) = 4 THEN 'PASS' ELSE 'FAIL' END AS result,
    COUNT(*) AS actual_value,
    4 AS expected_value
FROM account_groups
UNION ALL
SELECT 
    'TC-Q05: Budget Defaults Count' AS test_case,
    CASE WHEN COUNT(*) = 4 THEN 'PASS' ELSE 'FAIL' END AS result,
    COUNT(*) AS actual_value,
    4 AS expected_value
FROM budget_defaults
UNION ALL
SELECT 
    'TC-Q06: Settings Singleton Check' AS test_case,
    CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS result,
    COUNT(*) AS actual_value,
    1 AS expected_value
FROM settings;
```
