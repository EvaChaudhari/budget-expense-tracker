-- ==============================================================================
-- DATABASE SYSTEMS (DBS) PROJECT: COMPREHENSIVE SQL DEMONSTRATION SUITE
-- Target Database: ledgr (MySQL 8.4)
-- Purpose: Academic showcase of SQL queries, relational algebra, joins,
--          aggregations, subqueries, CTEs, analytical financial reports,
--          views, index optimization, and ACID transactions.
--
-- NOTE: All demonstration DML operations that mutate records are safely
--       enclosed in transactions and ROLLED BACK to preserve all existing data.
-- ==============================================================================

USE ledgr;

-- ==============================================================================
-- SECTION 1: BASIC DATA MANIPULATION (DML)
-- Demonstrating SELECT, INSERT, UPDATE, and DELETE operations.
-- ==============================================================================

-- 1.1 Multi-clause SELECT with pattern matching, range filtering, and ordering
-- Finds all expense transactions in 2025 where the expense exceeded RM 100,
-- filtered by note description, ordered by date descending.
SELECT 
    t.id,
    t.tx_date,
    t.tx_time,
    t.amount,
    t.note,
    t.description
FROM transactions t
WHERE t.amount < -100.00
  AND t.tx_date BETWEEN '2025-01-01' AND '2025-12-31'
  AND (t.note LIKE '%Grocer%' OR t.note LIKE '%shopping%' OR t.note LIKE '%sale%')
ORDER BY t.tx_date DESC, t.amount ASC
LIMIT 10;

-- 1.2 INSERT Demonstration (Safe Atomic Insert)
-- Inserts a sample transaction into an active account within a rolled-back transaction.
START TRANSACTION;

INSERT INTO transactions (account_id, category_id, amount, note, description, tx_date, tx_time)
VALUES (
    1, -- Cash account
    6, -- Food & Dining
    -25.50,
    'College cafeteria lunch with project team',
    '{"tags": ["college", "lunch"], "payment_method": "Cash"}',
    '2026-06-25',
    '12:30:00'
);

-- Verify insertion during the active transaction
SELECT * FROM transactions WHERE tx_date = '2026-06-25' AND amount = -25.50;

-- Rollback to ensure zero alteration to seeded data
ROLLBACK;


-- 1.3 UPDATE Demonstration with Parameterized Arithmetic
-- Updates the note and adjusts an amount within a rolled-back transaction.
START TRANSACTION;

UPDATE transactions
SET note = CONCAT(note, ' [VERIFIED]'),
    description = 'Re-verified transaction for DBS project audit'
WHERE id = 1;

-- Inspect updated record
SELECT id, note, description, updated_at FROM transactions WHERE id = 1;

-- Rollback to preserve original seed data
ROLLBACK;


-- 1.4 DELETE Demonstration with Referential Safety
-- Demonstrates attempting to delete a test record within a safe transaction.
START TRANSACTION;

-- Insert temporary test transaction
INSERT INTO transactions (id, account_id, category_id, amount, note, tx_date, tx_time)
VALUES (9999, 1, 6, -5.00, 'Temporary test transaction', '2026-06-25', '10:00:00');

-- Delete the record
DELETE FROM transactions WHERE id = 9999;

-- Confirm deletion
SELECT COUNT(*) AS test_row_exists FROM transactions WHERE id = 9999;

ROLLBACK;


-- ==============================================================================
-- SECTION 2: RELATIONAL JOINS & SET OPERATIONS
-- Demonstrating INNER JOIN, LEFT OUTER JOIN, and SELF JOIN.
-- ==============================================================================

-- 2.1 Multi-table INNER JOIN (3-Way Relational Join)
-- Resolves transaction IDs into full human-readable financial statements
-- with account names, category types, and group classifications.
SELECT 
    t.id AS tx_id,
    t.tx_date,
    t.tx_time,
    a.name AS account_name,
    g.name AS account_group,
    c.name AS category_name,
    c.type AS flow_type,
    t.amount,
    t.note
FROM transactions t
INNER JOIN accounts a ON t.account_id = a.id
INNER JOIN categories c ON t.category_id = c.id
LEFT JOIN account_groups g ON a.group_id = g.id
ORDER BY t.tx_date DESC, t.tx_time DESC
LIMIT 15;


-- 2.2 LEFT OUTER JOIN: Identifying Accounts and Group Memberships
-- Lists all accounts including any that have no group assigned (`group_id IS NULL`),
-- displaying total transaction volume associated with each account.
SELECT 
    a.id AS account_id,
    a.name AS account_name,
    a.type AS account_type,
    COALESCE(g.name, '(Ungrouped)') AS group_name,
    a.balance AS current_balance,
    COUNT(t.id) AS total_transactions,
    COALESCE(SUM(t.amount), 0.00) AS computed_ledger_sum
FROM accounts a
LEFT JOIN account_groups g ON a.group_id = g.id
LEFT JOIN transactions t ON a.id = t.account_id
GROUP BY a.id, a.name, a.type, g.name, a.balance
ORDER BY a.id ASC;


-- 2.3 SELF JOIN: Month-over-Month Expenditure Comparison
-- Joins an aggregated monthly summary table to itself to compute growth rates.
WITH MonthlyExpenses AS (
    SELECT 
        YEAR(tx_date) AS yr,
        MONTH(tx_date) AS mo,
        SUM(ABS(amount)) AS total_expense
    FROM transactions
    WHERE amount < 0
    GROUP BY YEAR(tx_date), MONTH(tx_date)
)
SELECT 
    curr.yr AS current_year,
    curr.mo AS current_month,
    curr.total_expense AS current_month_expense,
    prev.total_expense AS previous_month_expense,
    ROUND(curr.total_expense - prev.total_expense, 2) AS monthly_variance,
    ROUND(((curr.total_expense - prev.total_expense) / prev.total_expense) * 100, 2) AS pct_change
FROM MonthlyExpenses curr
INNER JOIN MonthlyExpenses prev 
    ON (curr.yr = prev.yr AND curr.mo = prev.mo + 1)
    OR (curr.yr = prev.yr + 1 AND curr.mo = 1 AND prev.mo = 12)
ORDER BY curr.yr DESC, curr.mo DESC;


-- ==============================================================================
-- SECTION 3: AGGREGATE FUNCTIONS, GROUP BY & HAVING
-- Demonstrating COUNT, SUM, AVG, MIN, MAX, GROUP BY, and HAVING filtering.
-- ==============================================================================

-- 3.1 Comprehensive Aggregation Across Flow Types
SELECT 
    c.type AS transaction_type,
    COUNT(t.id) AS total_transactions,
    ROUND(SUM(t.amount), 2) AS net_sum,
    ROUND(AVG(ABS(t.amount)), 2) AS average_amount,
    ROUND(MIN(ABS(t.amount)), 2) AS min_amount,
    ROUND(MAX(ABS(t.amount)), 2) AS max_amount
FROM transactions t
INNER JOIN categories c ON t.category_id = c.id
GROUP BY c.type;


-- 3.2 GROUP BY with HAVING Clause
-- Identifies heavy expenditure categories in 2025 where cumulative spending
-- exceeded RM 1,000, filtering aggregated results using HAVING.
SELECT 
    c.id AS category_id,
    c.name AS category_name,
    COUNT(t.id) AS transaction_count,
    ROUND(SUM(ABS(t.amount)), 2) AS total_spent,
    ROUND(AVG(ABS(t.amount)), 2) AS average_ticket_size
FROM transactions t
INNER JOIN categories c ON t.category_id = c.id
WHERE t.amount < 0
  AND t.tx_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY c.id, c.name
HAVING SUM(ABS(t.amount)) >= 1000.00
ORDER BY total_spent DESC;


-- ==============================================================================
-- SECTION 4: SUBQUERIES, CORRELATED SUBQUERIES & CTEs
-- Demonstrating scalar subqueries, EXISTS, IN, and Common Table Expressions.
-- ==============================================================================

-- 4.1 Correlated Subquery: Transactions Exceeding Category Average
-- Returns individual transactions where the amount spent was significantly higher
-- than the historical average transaction size for that specific category.
SELECT 
    t.id,
    t.tx_date,
    c.name AS category_name,
    ABS(t.amount) AS transaction_amount,
    cat_avg.avg_category_amount,
    ROUND(ABS(t.amount) - cat_avg.avg_category_amount, 2) AS amount_above_average
FROM transactions t
INNER JOIN categories c ON t.category_id = c.id
CROSS JOIN LATERAL (
    SELECT ROUND(AVG(ABS(sub_t.amount)), 2) AS avg_category_amount
    FROM transactions sub_t
    WHERE sub_t.category_id = t.category_id
      AND sub_t.amount < 0
) cat_avg
WHERE t.amount < 0
  AND ABS(t.amount) > cat_avg.avg_category_amount * 1.5
ORDER BY amount_above_average DESC
LIMIT 10;


-- 4.2 Correlated Subquery with NOT EXISTS
-- Finds categories that have had zero transactions recorded in the year 2026.
SELECT 
    c.id,
    c.name,
    c.type,
    c.icon
FROM categories c
WHERE NOT EXISTS (
    SELECT 1 
    FROM transactions t 
    WHERE t.category_id = c.id 
      AND YEAR(t.tx_date) = 2026
);


-- 4.3 Subquery with IN Operator
-- Retrieves all transactions belonging to accounts in the 'Bank' or 'Card' groups.
SELECT 
    t.id,
    t.tx_date,
    a.name AS account_name,
    t.amount,
    t.note
FROM transactions t
INNER JOIN accounts a ON t.account_id = a.id
WHERE a.group_id IN (
    SELECT id 
    FROM account_groups 
    WHERE name IN ('Bank', 'Card')
)
ORDER BY t.tx_date DESC
LIMIT 10;


-- 4.4 Common Table Expression (CTE): Net Cash Flow & Cumulative Savings
-- Computes monthly income, monthly expenses, net monthly balance, and cumulative
-- running balance over time using window functions.
WITH MonthlyLedger AS (
    SELECT 
        YEAR(tx_date) AS yr,
        MONTH(tx_date) AS mo,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS total_expense
    FROM transactions
    GROUP BY YEAR(tx_date), MONTH(tx_date)
)
SELECT 
    yr,
    mo,
    LPAD(CONCAT(yr, '-', LPAD(mo, 2, '0')), 7, ' ') AS period,
    total_income,
    total_expense,
    ROUND(total_income - total_expense, 2) AS net_cash_flow,
    ROUND(SUM(total_income - total_expense) OVER (ORDER BY yr, mo), 2) AS cumulative_surplus
FROM MonthlyLedger
ORDER BY yr ASC, mo ASC;


-- ==============================================================================
-- SECTION 5: DATE AND TIME FUNCTIONS
-- Demonstrating temporal filtering, date arithmetic, and formatting.
-- ==============================================================================

-- 5.1 Temporal Spending Breakdown by Day of the Week
-- Analyzes user spending patterns across days of the week.
SELECT 
    DAYNAME(tx_date) AS day_of_week,
    COUNT(id) AS transaction_count,
    ROUND(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 2) AS total_spent,
    ROUND(AVG(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 2) AS avg_spent_per_tx
FROM transactions
GROUP BY DAYNAME(tx_date), DAYOFWEEK(tx_date)
ORDER BY DAYOFWEEK(tx_date) ASC;


-- 5.2 Date Arithmetic and Formatting
-- Formats dates as '16-Jun-2026' and calculates days elapsed from a baseline date.
SELECT 
    id,
    DATE_FORMAT(tx_date, '%d-%b-%Y') AS formatted_date,
    tx_time,
    DATEDIFF('2026-06-30', tx_date) AS days_prior_to_june_end,
    amount,
    note
FROM transactions
WHERE tx_date >= DATE_SUB('2026-06-17', INTERVAL 30 DAY)
ORDER BY tx_date DESC
LIMIT 10;


-- ==============================================================================
-- SECTION 6: CORE FINANCIAL ANALYTICAL QUERIES
-- High-value business intelligence reports designed for the DBS evaluation.
-- ==============================================================================

-- 6.1 Category-Wise Spending Breakdown with Percentage Contribution
-- Computes category share of total expenditure for May 2026.
WITH PeriodTotals AS (
    SELECT SUM(ABS(amount)) AS total_period_expense
    FROM transactions
    WHERE amount < 0
      AND YEAR(tx_date) = 2026 
      AND MONTH(tx_date) = 5
)
SELECT 
    c.id AS category_id,
    c.name AS category_name,
    COUNT(t.id) AS transaction_count,
    ROUND(SUM(ABS(t.amount)), 2) AS category_spent,
    ROUND(AVG(ABS(t.amount)), 2) AS avg_transaction_size,
    ROUND((SUM(ABS(t.amount)) / pt.total_period_expense) * 100, 2) AS percentage_of_total
FROM transactions t
INNER JOIN categories c ON t.category_id = c.id
CROSS JOIN PeriodTotals pt
WHERE t.amount < 0
  AND YEAR(t.tx_date) = 2026 
  AND MONTH(t.tx_date) = 5
GROUP BY c.id, c.name, pt.total_period_expense
ORDER BY category_spent DESC;


-- 6.2 Monthly Financial Overview (Income vs Expenses Trend 2025–2026)
-- Full breakdown of all 18 seeded calendar months.
SELECT 
    YEAR(tx_date) AS summary_year,
    MONTH(tx_date) AS summary_month,
    DATE_FORMAT(tx_date, '%M %Y') AS month_label,
    ROUND(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 2) AS total_income,
    ROUND(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 2) AS total_expense,
    ROUND(SUM(amount), 2) AS net_savings,
    ROUND((SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) / 
           NULLIF(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)) * 100, 2) AS expense_to_income_ratio
FROM transactions
GROUP BY YEAR(tx_date), MONTH(tx_date), DATE_FORMAT(tx_date, '%M %Y')
ORDER BY summary_year DESC, summary_month DESC;


-- 6.3 Budget vs. Actual Spending Comparison (June 2026)
-- Resolves temporal budget defaults and month overrides, comparing against actual spending.
SELECT 
    c.id AS category_id,
    c.name AS category_name,
    COALESCE(bo.amount, (
        SELECT bd.amount 
        FROM budget_defaults bd
        WHERE bd.category_id = c.id
          AND (bd.start_year < 2026 OR (bd.start_year = 2026 AND bd.start_month <= 6))
        ORDER BY bd.start_year DESC, bd.start_month DESC 
        LIMIT 1
    )) AS allocated_budget,
    COALESCE(actual.spent, 0.00) AS actual_spent,
    ROUND(
        COALESCE(bo.amount, (
            SELECT bd.amount 
            FROM budget_defaults bd
            WHERE bd.category_id = c.id
              AND (bd.start_year < 2026 OR (bd.start_year = 2026 AND bd.start_month <= 6))
            ORDER BY bd.start_year DESC, bd.start_month DESC 
            LIMIT 1
        )) - COALESCE(actual.spent, 0.00), 2
    ) AS budget_variance,
    CASE 
        WHEN COALESCE(bo.amount, (
            SELECT bd.amount 
            FROM budget_defaults bd
            WHERE bd.category_id = c.id
              AND (bd.start_year < 2026 OR (bd.start_year = 2026 AND bd.start_month <= 6))
            ORDER BY bd.start_year DESC, bd.start_month DESC 
            LIMIT 1
        )) IS NULL THEN 'NO BUDGET SET'
        WHEN COALESCE(actual.spent, 0.00) > COALESCE(bo.amount, (
            SELECT bd.amount 
            FROM budget_defaults bd
            WHERE bd.category_id = c.id
              AND (bd.start_year < 2026 OR (bd.start_year = 2026 AND bd.start_month <= 6))
            ORDER BY bd.start_year DESC, bd.start_month DESC 
            LIMIT 1
        )) THEN 'OVER BUDGET'
        ELSE 'ON TRACK'
    END AS budget_status
FROM categories c
LEFT JOIN budget_overrides bo 
    ON bo.category_id = c.id AND bo.year = 2026 AND bo.month = 6
LEFT JOIN (
    SELECT category_id, SUM(ABS(amount)) AS spent
    FROM transactions
    WHERE amount < 0
      AND YEAR(tx_date) = 2026 AND MONTH(tx_date) = 6
    GROUP BY category_id
) actual ON actual.category_id = c.id
WHERE c.type = 'expense'
ORDER BY budget_status DESC, actual_spent DESC;


-- 6.4 Account Summaries & Ledger Reconciliation Audit
-- Verifies stored `accounts.balance` against the actual computed ledger sum of all transactions.
SELECT 
    a.id AS account_id,
    a.name AS account_name,
    a.type AS account_type,
    COALESCE(g.name, 'No Group') AS group_name,
    a.balance AS stored_balance,
    COALESCE(SUM(t.amount), 0.00) AS computed_ledger_sum,
    ROUND(a.balance - COALESCE(SUM(t.amount), 0.00), 2) AS reconciliation_difference,
    CASE 
        WHEN ROUND(a.balance - COALESCE(SUM(t.amount), 0.00), 2) = 0.00 THEN 'RECONCILED'
        ELSE 'OPENING_BALANCE_OFFSET'
    END AS audit_status
FROM accounts a
LEFT JOIN account_groups g ON a.group_id = g.id
LEFT JOIN transactions t ON a.id = t.account_id
GROUP BY a.id, a.name, a.type, g.name, a.balance
ORDER BY a.id ASC;


-- ==============================================================================
-- SECTION 7: RELATIONAL VIEWS (VIRTUAL TABLES)
-- Encapsulating complex financial logic for query abstraction.
-- ==============================================================================

-- 7.1 View: Monthly Category Financial Summary
CREATE OR REPLACE VIEW v_monthly_category_summary AS
SELECT 
    YEAR(t.tx_date) AS yr,
    MONTH(t.tx_date) AS mo,
    c.id AS category_id,
    c.name AS category_name,
    c.type AS category_type,
    c.icon AS category_icon,
    COUNT(t.id) AS transaction_count,
    ROUND(SUM(ABS(t.amount)), 2) AS total_amount,
    ROUND(AVG(ABS(t.amount)), 2) AS average_amount
FROM transactions t
INNER JOIN categories c ON t.category_id = c.id
GROUP BY YEAR(t.tx_date), MONTH(t.tx_date), c.id, c.name, c.type, c.icon;

-- Test View Query:
SELECT * FROM v_monthly_category_summary WHERE yr = 2026 AND mo = 5;


-- 7.2 View: Account Financial Status & Ledger Overview
CREATE OR REPLACE VIEW v_account_financial_overview AS
SELECT 
    a.id AS account_id,
    a.name AS account_name,
    a.type AS account_type,
    a.color AS account_color,
    COALESCE(g.name, 'Ungrouped') AS group_name,
    a.balance AS current_balance,
    COUNT(t.id) AS lifetime_transactions,
    COALESCE(MAX(t.tx_date), 'No Activity') AS latest_activity_date
FROM accounts a
LEFT JOIN account_groups g ON a.group_id = g.id
LEFT JOIN transactions t ON a.id = t.account_id
GROUP BY a.id, a.name, a.type, a.color, g.name, a.balance;

-- Test View Query:
SELECT * FROM v_account_financial_overview;


-- ==============================================================================
-- SECTION 8: PERFORMANCE OPTIMIZATION & SECONDARY INDEXES
-- DDL proposing high-performance secondary B-Tree indexes for read acceleration.
-- ==============================================================================

-- Analysis: High-frequency queries filter by `tx_date`, `category_id`, and `account_id`.
-- The following idempotent DDL statements add indexes to eliminate full table scans.

-- 8.1 Index on transaction date for fast calendar and range filtering
CREATE INDEX idx_tx_date ON transactions(tx_date);

-- 8.2 Compound index on category_id and tx_date for accelerated monthly category stats
CREATE INDEX idx_tx_cat_date ON transactions(category_id, tx_date);

-- 8.3 Compound index on account_id and tx_date for account ledger history lookups
CREATE INDEX idx_tx_account_date ON transactions(account_id, tx_date);

-- Verification: Inspect indexes on `transactions`
SHOW INDEX FROM transactions;


-- ==============================================================================
-- SECTION 9: ACID TRANSACTION MANAGEMENT
-- Demonstrating Atomicity, Consistency, Isolation, and Durability.
-- ==============================================================================

-- 9.1 Atomic Transaction Insertion with Synchronized Account Balance Update
START TRANSACTION;

-- Step 1: Insert new expense transaction
INSERT INTO transactions (account_id, category_id, amount, note, tx_date, tx_time)
VALUES (3, 6, -18.50, 'Coffee meeting with study group', '2026-06-25', '16:00:00');

-- Step 2: Synchronize account balance atomically
UPDATE accounts 
SET balance = balance - 18.50 
WHERE id = 3;

-- Step 3: Verify balanced state
SELECT id, name, balance FROM accounts WHERE id = 3;

-- Rollback for testing demonstration (use COMMIT in production)
ROLLBACK;


-- 9.2 Account-to-Account Transfer Simulation with Rollback on Invariant Failure
-- Transfers RM 150.00 from CIMB Current (id=3) to Maybank Savings (id=2).
START TRANSACTION;

-- Deduct from Source Account
UPDATE accounts 
SET balance = balance - 150.00 
WHERE id = 3;

-- Add to Destination Account
UPDATE accounts 
SET balance = balance + 150.00 
WHERE id = 2;

-- Record Debit Leg
INSERT INTO transactions (account_id, category_id, amount, note, tx_date, tx_time)
VALUES (3, 7, -150.00, 'Transfer to Maybank Savings', '2026-06-25', '17:00:00');

-- Record Credit Leg
INSERT INTO transactions (account_id, category_id, amount, note, tx_date, tx_time)
VALUES (2, 4, 150.00, 'Transfer from CIMB Current', '2026-06-25', '17:00:00');

-- Simulate conditional rollback check
-- If any error occurs or invariant fails, ROLLBACK restores both accounts to original balances.
ROLLBACK;


-- ==============================================================================
-- SECTION 10: EXPENSE TAGGING USING EXISTING SCHEMA (REQUIREMENT #10)
-- Demonstrating how tagging is supported via existing `note` and `description` fields.
-- ==============================================================================

-- 10.1 Querying Hashtagged Transactions via `note`
SELECT 
    id, 
    tx_date, 
    amount, 
    note
FROM transactions
WHERE note LIKE '%#%' OR note LIKE '%festive%' OR note LIKE '%party%';

-- 10.2 Structured JSON Querying via `description`
-- Searching within valid JSON stored in the `description` TEXT column.
SELECT 
    id,
    tx_date,
    amount,
    note,
    description
FROM transactions
WHERE description IS NOT NULL 
  AND JSON_VALID(description) = 1
  AND JSON_CONTAINS(description, '"work"', '$.tags');
