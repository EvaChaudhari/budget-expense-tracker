

USE budget_expense_db;

SHOW DATABASES;
USE budget_expense_db;

SHOW TABLES;
DESCRIBE users;
DESCRIBE household;
DESCRIBE household_member;
DESCRIBE account;
DESCRIBE category;
DESCRIBE payment_method;
DESCRIBE tag;
DESCRIBE `transaction`;
DESCRIBE transaction_tag;
DESCRIBE recurring_rule;
DESCRIBE budget;
DESCRIBE budget_override;
DESCRIBE savings_goal;
DESCRIBE goal_contribution;


SELECT * FROM users;
SELECT * FROM household;
SELECT * FROM household_member;
SELECT * FROM account;
SELECT * FROM category;
SELECT * FROM payment_method;
SELECT * FROM tag;
SELECT * FROM `transaction` LIMIT 10;
SELECT * FROM transaction_tag LIMIT 10;
SELECT * FROM recurring_rule;
SELECT * FROM budget;
SELECT * FROM budget_override;
SELECT * FROM savings_goal;
SELECT * FROM goal_contribution;

SELECT
    transaction_id,
    amount,
    transaction_type,
    transaction_date,
    description
FROM `transaction`
WHERE transaction_type = 'EXPENSE'
ORDER BY amount DESC
LIMIT 10;

INSERT INTO `transaction`
    (account_id, category_id, payment_method_id, amount, transaction_type, transaction_date, description)
VALUES
    (1, 2, 1, 35.00, 'EXPENSE', '2022-03-05', 'Metro - college commute');

SELECT LAST_INSERT_ID() AS newly_inserted_transaction_id;

UPDATE `transaction`
SET description = 'McDonald''s with company (corrected)'
WHERE description = 'McDonald''s with company'
LIMIT 1;


SELECT transaction_id, description
FROM `transaction`
WHERE description LIKE '%McDonald%';

DELETE FROM `transaction`
WHERE description = 'Metro - college commute'
  AND transaction_date = '2022-03-05'
LIMIT 1;

SELECT COUNT(*) AS transactions_after_delete FROM `transaction`;

SELECT
    t.transaction_id,
    a.account_name,
    c.category_name,
    c.category_type,
    t.amount,
    t.transaction_type,
    t.transaction_date,
    t.description
FROM `transaction` t
INNER JOIN account a  ON t.account_id  = a.account_id
INNER JOIN category c ON t.category_id = c.category_id
ORDER BY t.transaction_date DESC
LIMIT 20;

SELECT
    a.account_id,
    a.account_name,
    a.account_type,
    COUNT(t.transaction_id)      AS total_transactions,
    COALESCE(SUM(t.amount), 0)   AS total_flow
FROM account a
LEFT JOIN `transaction` t ON a.account_id = t.account_id
GROUP BY a.account_id, a.account_name, a.account_type;

SELECT
    u.full_name,
    a.account_name,
    c.category_name,
    pm.method_name,
    t.amount,
    t.transaction_type,
    t.transaction_date,
    t.description
FROM `transaction` t
JOIN account a            ON t.account_id        = a.account_id
JOIN users u              ON a.user_id            = u.user_id
JOIN category c           ON t.category_id        = c.category_id
LEFT JOIN payment_method pm ON t.payment_method_id = pm.payment_method_id
ORDER BY t.transaction_date DESC
LIMIT 15;

SELECT
    c.category_name,
    COUNT(t.transaction_id)   AS num_transactions,
    SUM(t.amount)             AS total_spent,
    AVG(t.amount)             AS avg_per_transaction,
    MAX(t.amount)             AS max_single_expense,
    MIN(t.amount)             AS min_single_expense
FROM `transaction` t
JOIN category c ON t.category_id = c.category_id
WHERE t.transaction_type = 'EXPENSE'
GROUP BY c.category_id, c.category_name
ORDER BY total_spent DESC;

SELECT
    transaction_id,
    amount,
    transaction_type,
    transaction_date,
    description
FROM `transaction`
WHERE amount > (
    SELECT AVG(amount)
    FROM `transaction`
    WHERE transaction_type = 'EXPENSE'
)
AND transaction_type = 'EXPENSE'
ORDER BY amount DESC;

SELECT
    YEAR(transaction_date)  AS yr,
    MONTH(transaction_date) AS mo,
    COUNT(*)                AS num_transactions,
    SUM(amount)             AS total_expenses,
    AVG(amount)             AS avg_expense
FROM `transaction`
WHERE transaction_type = 'EXPENSE'
GROUP BY YEAR(transaction_date), MONTH(transaction_date)
ORDER BY yr, mo;

SELECT
    c.category_name,
    SUM(t.amount) AS total_expenses,
    ROUND(
        SUM(t.amount) * 100.0 /
        (SELECT SUM(amount) FROM `transaction` WHERE transaction_type = 'EXPENSE'),
    2) AS pct_of_total
FROM `transaction` t
JOIN category c ON t.category_id = c.category_id
WHERE t.transaction_type = 'EXPENSE'
GROUP BY c.category_id, c.category_name
ORDER BY total_expenses DESC;
SELECT
    u.full_name,
    COUNT(t.transaction_id)  AS num_transactions,
    SUM(t.amount)            AS total_spent
FROM users u
JOIN household_member hm ON u.user_id    = hm.user_id
JOIN account a            ON a.user_id   = u.user_id
JOIN `transaction` t      ON t.account_id = a.account_id
WHERE t.transaction_type = 'EXPENSE'
GROUP BY u.user_id, u.full_name
ORDER BY total_spent DESC;
SELECT
    u.full_name,
    c.category_name,
    b.month,
    b.year,
    b.limit_amount                                           AS budgeted,
    COALESCE(SUM(t.amount), 0)                               AS actual_spent,
    b.limit_amount - COALESCE(SUM(t.amount), 0)             AS remaining,
    ROUND(COALESCE(SUM(t.amount), 0) * 100.0 / b.limit_amount, 2) AS pct_used
FROM budget b
JOIN users u    ON b.user_id    = u.user_id
JOIN category c ON b.category_id = c.category_id
JOIN account a  ON a.user_id    = b.user_id
LEFT JOIN `transaction` t
    ON  t.account_id       = a.account_id
    AND t.category_id      = b.category_id
    AND t.transaction_type = 'EXPENSE'
    AND MONTH(t.transaction_date) = b.month
    AND YEAR(t.transaction_date)  = b.year
GROUP BY b.budget_id, u.full_name, c.category_name, b.month, b.year, b.limit_amount
ORDER BY b.year, b.month;
SELECT
    c.category_name,
    b.month,
    b.year,
    b.limit_amount,
    COALESCE(SUM(t.amount), 0)                         AS spent,
    b.limit_amount - COALESCE(SUM(t.amount), 0)        AS remaining_budget,
    CASE
        WHEN COALESCE(SUM(t.amount), 0) >= b.limit_amount
            THEN 'OVER BUDGET'
        WHEN COALESCE(SUM(t.amount), 0) >= b.limit_amount * b.alert_threshold_pct / 100
            THEN 'NEAR LIMIT'
        ELSE 'ON TRACK'
    END AS budget_status
FROM budget b
JOIN category c ON b.category_id = c.category_id
JOIN account a  ON a.user_id     = b.user_id
LEFT JOIN `transaction` t
    ON  t.account_id = a.account_id
    AND t.category_id = b.category_id
    AND t.transaction_type = 'EXPENSE'
    AND MONTH(t.transaction_date) = b.month
    AND YEAR(t.transaction_date)  = b.year
GROUP BY
    b.budget_id, c.category_name, b.month,
    b.year, b.limit_amount, b.alert_threshold_pct;
SELECT
    sg.goal_name,
    sg.target_amount,
    sg.current_amount,
    sg.target_date,
    sg.status,
    sg.target_amount - sg.current_amount                   AS amount_remaining,
    ROUND(sg.current_amount * 100.0 / sg.target_amount, 2) AS progress_pct,
    DATEDIFF(sg.target_date, CURDATE())                     AS days_until_target
FROM savings_goal sg
WHERE sg.user_id = 1
ORDER BY progress_pct DESC;
SELECT
    sg.goal_name,
    COUNT(gc.contribution_id)  AS num_contributions,
    SUM(gc.amount)             AS total_contributed,
    MIN(gc.contribution_date)  AS first_contribution,
    MAX(gc.contribution_date)  AS latest_contribution
FROM savings_goal sg
LEFT JOIN goal_contribution gc ON sg.goal_id = gc.goal_id
GROUP BY sg.goal_id, sg.goal_name;

SELECT
    rr.recurring_rule_id,
    a.account_name,
    c.category_name,
    rr.amount,
    rr.frequency,
    rr.start_date,
    rr.end_date,
    rr.next_due_date,
    rr.transaction_type
FROM recurring_rule rr
JOIN account a  ON rr.account_id  = a.account_id
JOIN category c ON rr.category_id = c.category_id
ORDER BY rr.next_due_date;
SELECT
    tg.tag_name,
    COUNT(tt.transaction_id)  AS tagged_transactions,
    SUM(t.amount)             AS total_amount
FROM tag tg
JOIN transaction_tag tt ON tg.tag_id        = tt.tag_id
JOIN `transaction` t    ON tt.transaction_id = t.transaction_id
WHERE t.transaction_type = 'EXPENSE'
GROUP BY tg.tag_id, tg.tag_name
ORDER BY total_amount DESC;
SELECT
    TABLE_NAME             AS child_table,
    COLUMN_NAME            AS child_column,
    CONSTRAINT_NAME        AS fk_name,
    REFERENCED_TABLE_NAME  AS parent_table,
    REFERENCED_COLUMN_NAME AS parent_column
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'budget_expense_db'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;
SELECT t.transaction_id, t.account_id
FROM `transaction` t
LEFT JOIN account a ON t.account_id = a.account_id
LEFT JOIN users u   ON a.user_id    = u.user_id
WHERE u.user_id IS NULL;
SELECT
    a.account_id,
    a.account_name,
    a.current_balance   AS stored_balance,
    a.opening_balance + COALESCE(SUM(
        CASE
            WHEN t.transaction_type = 'INCOME'  THEN  t.amount
            WHEN t.transaction_type = 'EXPENSE' THEN -t.amount
            ELSE 0
        END
    ), 0)               AS calculated_balance
FROM account a
LEFT JOIN `transaction` t ON t.account_id = a.account_id
GROUP BY a.account_id, a.account_name, a.current_balance, a.opening_balance;
SELECT 'users'           AS table_name, COUNT(*) AS count FROM users            UNION ALL
SELECT 'household',                     COUNT(*)          FROM household         UNION ALL
SELECT 'household_member',              COUNT(*)          FROM household_member  UNION ALL
SELECT 'account',                       COUNT(*)          FROM account           UNION ALL
SELECT 'category',                      COUNT(*)          FROM category          UNION ALL
SELECT 'payment_method',               COUNT(*)          FROM payment_method    UNION ALL
SELECT 'tag',                           COUNT(*)          FROM tag               UNION ALL
SELECT 'transaction',                   COUNT(*)          FROM `transaction`     UNION ALL
SELECT 'transaction_tag',               COUNT(*)          FROM transaction_tag   UNION ALL
SELECT 'recurring_rule',                COUNT(*)          FROM recurring_rule    UNION ALL
SELECT 'budget',                        COUNT(*)          FROM budget            UNION ALL
SELECT 'budget_override',               COUNT(*)          FROM budget_override   UNION ALL
SELECT 'savings_goal',                  COUNT(*)          FROM savings_goal      UNION ALL
SELECT 'goal_contribution',             COUNT(*)          FROM goal_contribution;

SELECT
    account_id,
    category_id,
    amount,
    transaction_date,
    COUNT(*) AS duplicate_count
FROM `transaction`
GROUP BY account_id, category_id, amount, transaction_date
HAVING COUNT(*) > 1;

SELECT COUNT(*) AS null_amounts FROM `transaction` WHERE amount IS NULL;

SELECT COUNT(*) AS null_dates FROM `transaction` WHERE transaction_date IS NULL;

SELECT b.budget_id, b.category_id
FROM budget b
LEFT JOIN category c ON b.category_id = c.category_id
WHERE c.category_id IS NULL;

INSERT INTO users (user_id, full_name, email, password_hash)
VALUES (1, 'Duplicate User', 'dup@example.com', 'hash123');

INSERT INTO users (full_name, email, password_hash)
VALUES ('Another User', 'bhumi@example.com', 'hash456');

INSERT INTO users (full_name, email, password_hash)
VALUES (NULL, 'test@test.com', 'hash789');

INSERT INTO `transaction`
    (account_id, category_id, amount, transaction_type, transaction_date)
VALUES
    (1, 1, -100.00, 'EXPENSE', '2022-01-01');

INSERT INTO budget (user_id, category_id, month, year, limit_amount)
VALUES (1, 1, 13, 2022, 1000.00);

INSERT INTO account (user_id, account_name, account_type)
VALUES (9999, 'Ghost Account', 'Cash Wallet');


START TRANSACTION;
    DELETE FROM users WHERE user_id = 1;
ROLLBACK;

INSERT INTO budget (user_id, category_id, month, year, limit_amount)
VALUES (1, 1, 1, 2022, 9999.00);
START TRANSACTION;
    INSERT INTO `transaction`
        (account_id, category_id, amount, transaction_type, transaction_date, description)
    VALUES
        (1, 1, 500.00, 'EXPENSE', '2022-04-01', 'Test rollback entry — SHOULD DISAPPEAR');
    
    SELECT COUNT(*) AS count_during_transaction FROM `transaction`;
ROLLBACK;
SELECT COUNT(*) AS count_after_rollback FROM `transaction`;

START TRANSACTION;

    INSERT INTO `transaction`
        (account_id, category_id, payment_method_id, amount, transaction_type, transaction_date)
    VALUES
        (1, 1, 4, 100.00, 'EXPENSE', '2022-04-02');

    SET @test_txn_id = LAST_INSERT_ID();

  
    DELETE FROM payment_method WHERE payment_method_id = 4;

    SELECT transaction_id, payment_method_id
    FROM `transaction`
    WHERE transaction_id = @test_txn_id;


ROLLBACK;

SELECT COUNT(*) AS dataset_transactions FROM `transaction`;

SELECT
    YEAR(transaction_date)  AS yr,
    MONTH(transaction_date) AS mo,
    COUNT(*)                AS num_records
FROM `transaction`
GROUP BY YEAR(transaction_date), MONTH(transaction_date)
ORDER BY yr, mo;
SELECT
    transaction_type,
    COUNT(*) AS count,
    SUM(amount) AS total
FROM `transaction`
GROUP BY transaction_type;
SELECT
    a.account_name,
    COUNT(t.transaction_id) AS txn_count
FROM account a
LEFT JOIN `transaction` t ON a.account_id = t.account_id
GROUP BY a.account_id, a.account_name;


