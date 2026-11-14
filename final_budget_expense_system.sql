
DROP DATABASE IF EXISTS budget_expense_db;
CREATE DATABASE budget_expense_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE budget_expense_db;
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_email CHECK (email LIKE '%_@__%.__%')
) ENGINE = InnoDB;
CREATE TABLE household (
    household_id INT AUTO_INCREMENT PRIMARY KEY,
    household_name VARCHAR(100) NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_household_creator
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;
CREATE TABLE household_member (
    household_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(30) DEFAULT 'member',
    access_level VARCHAR(30) DEFAULT 'standard',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (household_id, user_id),
    CONSTRAINT fk_member_household
        FOREIGN KEY (household_id)
        REFERENCES household(household_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_member_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT chk_member_role CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    CONSTRAINT chk_member_access CHECK (access_level IN ('full', 'standard', 'read_only'))
) ENGINE = InnoDB;
CREATE TABLE account (
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    opening_balance DECIMAL(12,2) DEFAULT 0.00,
    current_balance DECIMAL(12,2) DEFAULT 0.00,
    currency CHAR(3) DEFAULT 'INR',
    CONSTRAINT fk_account_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_account_type CHECK (account_type IN ('Bank Account', 'Cash Wallet', 'Savings Account', 'Credit Card', 'Digital Wallet'))
) ENGINE = InnoDB;
CREATE TABLE category (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    category_name VARCHAR(100) NOT NULL,
    category_type ENUM('INCOME', 'EXPENSE') NOT NULL,
    parent_category_id INT NULL,
    CONSTRAINT fk_category_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_category_parent
        FOREIGN KEY (parent_category_id)
        REFERENCES category(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT uq_cat_name_type_user UNIQUE (category_name, category_type, user_id)
) ENGINE = InnoDB;

CREATE TABLE payment_method (
    payment_method_id INT AUTO_INCREMENT PRIMARY KEY,
    method_name VARCHAR(50) NOT NULL UNIQUE
) ENGINE = InnoDB;


CREATE TABLE tag (
    tag_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tag_name VARCHAR(50) NOT NULL,
    CONSTRAINT fk_tag_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT uq_user_tag UNIQUE (user_id, tag_name)
) ENGINE = InnoDB;

CREATE TABLE `transaction` (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    category_id INT NOT NULL,
    payment_method_id INT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transaction_type ENUM('INCOME', 'EXPENSE') NOT NULL,
    transaction_date DATE NOT NULL,
    description VARCHAR(255),
    CONSTRAINT fk_transaction_account
        FOREIGN KEY (account_id)
        REFERENCES account(account_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_transaction_category
        FOREIGN KEY (category_id)
        REFERENCES category(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_transaction_payment
        FOREIGN KEY (payment_method_id)
        REFERENCES payment_method(payment_method_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT chk_transaction_amount CHECK (amount > 0)
) ENGINE = InnoDB;

CREATE TABLE transaction_tag (
    transaction_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (transaction_id, tag_id),
    CONSTRAINT fk_transaction_tag_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES `transaction`(transaction_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_transaction_tag_tag
        FOREIGN KEY (tag_id)
        REFERENCES tag(tag_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE recurring_rule (
    recurring_rule_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    account_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    frequency ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    next_due_date DATE NOT NULL,
    transaction_type ENUM('INCOME', 'EXPENSE') NOT NULL,
    CONSTRAINT fk_recurring_category
        FOREIGN KEY (category_id)
        REFERENCES category(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_recurring_account
        FOREIGN KEY (account_id)
        REFERENCES account(account_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_recurring_amount CHECK (amount > 0),
    CONSTRAINT chk_recurring_dates CHECK (end_date IS NULL OR end_date >= start_date)
) ENGINE = InnoDB;

CREATE TABLE budget (
    budget_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    month TINYINT NOT NULL,
    year SMALLINT NOT NULL,
    limit_amount DECIMAL(12,2) NOT NULL,
    alert_threshold_pct DECIMAL(5,2) DEFAULT 80.00,
    CONSTRAINT fk_budget_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_budget_category
        FOREIGN KEY (category_id)
        REFERENCES category(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT chk_budget_month CHECK (month BETWEEN 1 AND 12),
    CONSTRAINT chk_budget_limit CHECK (limit_amount >= 0),
    CONSTRAINT chk_budget_alert CHECK (alert_threshold_pct BETWEEN 0 AND 100),
    CONSTRAINT uq_budget_period UNIQUE (user_id, category_id, month, year)
) ENGINE = InnoDB;

CREATE TABLE budget_override (
    override_id INT AUTO_INCREMENT PRIMARY KEY,
    budget_id INT NOT NULL,
    month TINYINT NOT NULL,
    year SMALLINT NOT NULL,
    override_amount DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_override_budget
        FOREIGN KEY (budget_id)
        REFERENCES budget(budget_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT chk_override_month CHECK (month BETWEEN 1 AND 12),
    CONSTRAINT chk_override_amount CHECK (override_amount >= 0),
    CONSTRAINT uq_override_period UNIQUE (budget_id, month, year)
) ENGINE = InnoDB;

CREATE TABLE savings_goal (
    goal_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    goal_name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL,
    current_amount DECIMAL(12,2) DEFAULT 0.00,
    target_date DATE NULL,
    status ENUM('ACTIVE', 'COMPLETED', 'PAUSED') DEFAULT 'ACTIVE',
    CONSTRAINT fk_goal_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT chk_goal_target CHECK (target_amount > 0),
    CONSTRAINT chk_goal_current CHECK (current_amount >= 0)
) ENGINE = InnoDB;
CREATE TABLE goal_contribution (
    contribution_id INT AUTO_INCREMENT PRIMARY KEY,
    goal_id INT NOT NULL,
    transaction_id INT NULL,
    amount DECIMAL(12,2) NOT NULL,
    contribution_date DATE NOT NULL,
    CONSTRAINT fk_contribution_goal
        FOREIGN KEY (goal_id)
        REFERENCES savings_goal(goal_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_contribution_transaction
        FOREIGN KEY (transaction_id)
        REFERENCES `transaction`(transaction_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT chk_contribution_amount CHECK (amount > 0)
) ENGINE = InnoDB;
CREATE INDEX idx_transaction_date ON `transaction`(transaction_date);
CREATE INDEX idx_transaction_account ON `transaction`(account_id);
CREATE INDEX idx_transaction_category ON `transaction`(category_id);
CREATE INDEX idx_budget_lookup ON budget(user_id, month, year);
INSERT INTO users (user_id, full_name, email, password_hash) VALUES
(1, 'Bhumi Student', 'bhumi@example.com', '$2y$12$e8pA8N8K3uV1K7bQ9aN1ye0wO7gqD5jF7L1e3u9Y1w0m4o6p2q7r8'),
(2, 'Aravind Kumar', 'aravind@example.com', '$2y$12$b6pL9K2M4uR8T1bQ5cN2ye9wO4hqE3jF9L2e5u1Y8w4m2o7p6q3s1'),
(3, 'Gobi Raman', 'gobi@example.com', '$2y$12$f1pM4N7K9uW2L8bQ6dN3ye1wO8iqF4jG0M3e6u2Y9w5m3o8p7q4t2'),
(4, 'Preethi Mohan', 'preethi@example.com', '$2y$12$h2pN5O8L0uX3M9cR7eO4zf2wP9jrG5kH1N4f7v3Z0x6n4p9q8r5u3');


INSERT INTO household (household_id, household_name, created_by) VALUES
(1, 'Hostel / Flat 304', 1);

INSERT INTO household_member (household_id, user_id, role, access_level) VALUES
(1, 1, 'owner', 'full'),
(1, 2, 'member', 'standard'),
(1, 3, 'member', 'standard'),
(1, 4, 'member', 'standard');
INSERT INTO payment_method (payment_method_id, method_name) VALUES
(1, 'Net Banking / UPI'),
(2, 'Cash'),
(3, 'Debit Card'),
(4, 'Credit Card');

INSERT INTO account (account_id, user_id, account_name, account_type, opening_balance, current_balance, currency) VALUES
(1, 1, 'CUB - online payment', 'Bank Account', 25000.00, 25000.00, 'INR'),
(2, 1, 'Cash', 'Cash Wallet', 5000.00, 5000.00, 'INR'),
(3, 1, 'Emergency Reserve Bank', 'Savings Account', 15000.00, 15000.00, 'INR');
INSERT INTO category (category_id, user_id, category_name, category_type, parent_category_id) VALUES

(1, NULL, 'Food', 'EXPENSE', NULL),
(2, NULL, 'Transportation', 'EXPENSE', NULL),
(3, NULL, 'Household', 'EXPENSE', NULL),
(4, NULL, 'Apparel', 'EXPENSE', NULL),
(5, NULL, 'Social Life', 'EXPENSE', NULL),
(6, NULL, 'Other', 'EXPENSE', NULL),
(7, NULL, 'Education', 'EXPENSE', NULL),
(8, NULL, 'Beauty', 'EXPENSE', NULL),
(9, NULL, 'Self-development', 'EXPENSE', NULL),
(10, NULL, 'Gift', 'EXPENSE', NULL),
(11, NULL, 'Salary', 'INCOME', NULL),
(12, NULL, 'Allowance', 'INCOME', NULL),
(13, NULL, 'Other', 'INCOME', NULL),
(14, NULL, 'Petty cash', 'INCOME', NULL);
INSERT INTO tag (tag_id, user_id, tag_name) VALUES
(1, 1, 'College'),
(2, 1, 'Travel'),
(3, 1, 'Foodie'),
(4, 1, 'Friends'),
(5, 1, 'Essentials');
INSERT INTO recurring_rule (recurring_rule_id, category_id, account_id, amount, frequency, start_date, end_date, next_due_date, transaction_type) VALUES
(1, 3, 1, 4800.00, 'MONTHLY', '2021-12-01', '2022-12-31', '2022-04-01', 'EXPENSE'),
(2, 12, 1, 1000.00, 'MONTHLY', '2021-12-01', NULL, '2022-04-01', 'INCOME'),
(3, 6, 1, 479.00, 'MONTHLY', '2022-01-01', '2022-12-31', '2022-04-12', 'EXPENSE');
INSERT INTO budget (budget_id, user_id, category_id, month, year, limit_amount, alert_threshold_pct) VALUES
(1, 1, 1, 12, 2021, 5000.00, 80.00),
(2, 1, 2, 12, 2021, 2500.00, 80.00),
(3, 1, 3, 12, 2021, 6000.00, 85.00),
(4, 1, 1, 1, 2022, 5500.00, 80.00),
(5, 1, 2, 1, 2022, 2500.00, 80.00),
(6, 1, 1, 2, 2022, 5000.00, 80.00);
INSERT INTO budget_override (override_id, budget_id, month, year, override_amount) VALUES
(1, 4, 1, 2022, 6500.00); -
INSERT INTO savings_goal (goal_id, user_id, goal_name, target_amount, current_amount, target_date, status) VALUES
(1, 1, 'Laptop Upgrade Fund', 60000.00, 12000.00, '2022-12-31', 'ACTIVE'),
(2, 1, 'Emergency Buffer', 20000.00, 8000.00, '2022-06-30', 'ACTIVE');

INSERT INTO `transaction` (account_id, category_id, payment_method_id, amount, transaction_type, transaction_date, description) VALUES
(1, 1, 1, 50.00, 'EXPENSE', '2022-03-02', 'Brownie'),
(1, 6, 1, 300.00, 'EXPENSE', '2022-03-02', 'To lended people'),
(1, 1, 1, 78.00, 'EXPENSE', '2022-03-01', 'Dinner'),
(1, 2, 1, 30.00, 'EXPENSE', '2022-03-01', 'Metro'),
(1, 1, 1, 67.00, 'EXPENSE', '2022-03-01', 'Snacks'),
(1, 13, 1, 100.00, 'INCOME', '2022-03-01', 'From vicky'),
(1, 13, 1, 500.00, 'INCOME', '2022-03-01', 'From dad'),
(1, 1, 1, 339.15, 'EXPENSE', '2022-02-28', 'Pizza'),
(1, 13, 1, 200.00, 'INCOME', '2022-02-28', 'From kumara'),
(1, 1, 1, 243.00, 'EXPENSE', '2022-02-27', 'Lunch'),
(1, 1, 1, 25.00, 'EXPENSE', '2022-02-26', NULL),
(1, 13, 1, 1500.00, 'INCOME', '2022-02-26', 'From dad'),
(1, 6, 1, 100.00, 'EXPENSE', '2022-02-26', 'To karthi'),
(1, 5, 1, 1700.00, 'EXPENSE', '2022-02-26', NULL),
(1, 1, 1, 40.00, 'EXPENSE', '2022-02-26', 'Snacks'),
(1, 1, 1, 84.00, 'EXPENSE', '2022-02-26', 'Tea lights'),
(1, 1, 1, 33.00, 'EXPENSE', '2022-02-25', NULL),
(1, 3, 1, 303.00, 'EXPENSE', '2022-02-24', NULL),
(1, 1, 1, 289.00, 'EXPENSE', '2022-02-24', 'Creamstone'),
(1, 1, 1, 324.70, 'EXPENSE', '2022-02-24', 'Tamen'),
(1, 4, 1, 399.00, 'EXPENSE', '2022-02-23', 'Hoodie for gobi'),
(1, 1, 1, 83.00, 'EXPENSE', '2022-02-23', 'Eggs'),
(1, 4, 1, 399.00, 'EXPENSE', '2022-02-23', 'Earphone'),
(1, 2, 1, 120.00, 'EXPENSE', '2022-02-22', 'Auto to laxmi mills'),
(1, 2, 1, 1300.00, 'EXPENSE', '2022-02-21', 'It better be worth it'),
(1, 2, 1, 138.00, 'EXPENSE', '2022-02-21', 'Travel to koyambedu'),
(1, 3, 1, 336.00, 'EXPENSE', '2022-02-21', 'Stuffs'),
(1, 2, 1, 201.80, 'EXPENSE', '2022-02-21', 'Train cbe to chn'),
(1, 1, 1, 200.00, 'EXPENSE', '2022-02-20', 'Lunch'),
(1, 1, 1, 111.00, 'EXPENSE', '2022-02-19', 'Random stuff for drinks'),
(1, 1, 1, 250.00, 'EXPENSE', '2022-02-19', 'Snacks'),
(1, 2, 1, 1575.00, 'EXPENSE', '2022-02-19', 'Bus ticket'),
(1, 2, 1, 200.00, 'EXPENSE', '2022-02-19', 'Took from sbi'),
(1, 1, 1, 380.00, 'EXPENSE', '2022-02-19', 'Ramen with gobi'),
(1, 2, 1, 60.00, 'EXPENSE', '2022-02-19', 'Metro'),
(1, 6, 1, 50.00, 'EXPENSE', '2022-02-19', 'To auto anna'),
(1, 2, 1, 270.00, 'EXPENSE', '2022-02-19', 'To egmore'),
(1, 1, 1, 348.00, 'EXPENSE', '2022-02-18', 'Kfc dinner'),
(1, 1, 1, 80.00, 'EXPENSE', '2022-02-17', 'Lunch'),
(1, 1, 1, 165.00, 'EXPENSE', '2022-02-16', 'Side dishes'),
(1, 1, 1, 475.00, 'EXPENSE', '2022-02-16', 'Kfc'),
(1, 5, 1, 100.00, 'EXPENSE', '2022-02-13', 'Games'),
(1, 1, 1, 491.00, 'EXPENSE', '2022-02-12', 'Dinner with aravind and buddies'),
(1, 3, 1, 70.00, 'EXPENSE', '2022-02-12', 'Mirror'),
(1, 1, 1, 80.00, 'EXPENSE', '2022-02-12', 'Lunch'),
(1, 13, 1, 10000.00, 'INCOME', '2022-02-12', 'From dad'),
(1, 1, 1, 373.00, 'EXPENSE', '2022-02-11', 'Dinner with aravind'),
(1, 1, 1, 641.00, 'EXPENSE', '2022-02-10', 'Kfc dinner'),
(1, 13, 1, 1000.00, 'INCOME', '2022-02-08', 'From dad'),
(1, 3, 1, 2099.00, 'EXPENSE', '2022-02-08', 'Bean bag');
INSERT INTO `transaction` (account_id, category_id, payment_method_id, amount, transaction_type, transaction_date, description) VALUES
(1, 2, 1, 214.00, 'EXPENSE', '2022-02-07', 'Auto to Gobi''s place'),
(1, 1, 1, 125.00, 'EXPENSE', '2022-02-06', 'Cakepark'),
(1, 1, 1, 150.00, 'EXPENSE', '2022-02-06', 'To kumara'),
(1, 2, 1, 1000.00, 'EXPENSE', '2022-02-06', 'To chennai'),
(1, 13, 1, 5000.00, 'INCOME', '2022-02-06', 'Salary from dad'),
(1, 6, 1, 1500.00, 'EXPENSE', '2022-02-06', 'To gobi'),
(1, 1, 1, 80.00, 'EXPENSE', '2022-02-04', 'Shawarma'),
(1, 1, 1, 50.00, 'EXPENSE', '2022-02-03', 'Good soup'),
(1, 6, 1, 150.00, 'EXPENSE', '2022-02-03', 'To gowdham'),
(1, 1, 1, 120.00, 'EXPENSE', '2022-02-02', 'Parotta'),
(1, 13, 1, 500.00, 'INCOME', '2022-02-02', 'From dad'),
(1, 2, 1, 50.00, 'EXPENSE', '2022-01-31', 'Vnr to apk'),
(1, 6, 1, 200.00, 'EXPENSE', '2022-01-31', 'To vicky'),
(1, 2, 1, 153.00, 'EXPENSE', '2022-01-31', 'To ksr station'),
(1, 1, 1, 155.00, 'EXPENSE', '2022-01-30', 'Dinner'),
(1, 1, 1, 120.00, 'EXPENSE', '2022-01-30', 'Cycle gap'),
(1, 1, 1, 105.00, 'EXPENSE', '2022-01-30', 'Brunch'),
(1, 2, 1, 44.00, 'EXPENSE', '2022-01-29', 'Rapido to pg'),
(1, 6, 1, 100.00, 'EXPENSE', '2022-01-29', 'Sent to barath'),
(1, 1, 1, 10.00, 'EXPENSE', '2022-01-28', 'Banana'),
(1, 1, 1, 138.00, 'EXPENSE', '2022-01-28', 'Lunch with company'),
(1, 2, 1, 43.00, 'EXPENSE', '2022-01-27', 'Rapido to pg'),
(1, 6, 1, 300.00, 'EXPENSE', '2022-01-27', 'To vicky'),
(1, 6, 1, 100.00, 'EXPENSE', '2022-01-27', 'To vishnu'),
(1, 1, 1, 279.00, 'EXPENSE', '2022-01-27', 'Zinger box meal'),
(1, 13, 1, 300.00, 'INCOME', '2022-01-27', 'From vicky'),
(1, 13, 1, 1500.00, 'INCOME', '2022-01-27', 'From dad'),
(1, 1, 1, 115.00, 'EXPENSE', '2022-01-26', 'Snacks'),
(1, 13, 1, 125.00, 'INCOME', '2022-01-26', 'Vishnu 100 gowdham 25'),
(1, 1, 1, 25.00, 'EXPENSE', '2022-01-26', 'Paani poori'),
(1, 1, 1, 259.00, 'EXPENSE', '2022-01-25', 'Kfc date with myself'),
(1, 1, 1, 18.00, 'EXPENSE', '2022-01-25', 'Lemon tea'),
(1, 2, 1, 325.00, 'EXPENSE', '2022-01-25', 'Train to vnr'),
(1, 1, 1, 40.00, 'EXPENSE', '2022-01-24', 'Snack'),
(1, 1, 1, 133.00, 'EXPENSE', '2022-01-24', 'Lunch with company'),
(1, 1, 1, 40.00, 'EXPENSE', '2022-01-23', 'Pepsi'),
(1, 1, 1, 465.00, 'EXPENSE', '2022-01-23', 'Dinner'),
(1, 1, 1, 300.00, 'EXPENSE', '2022-01-23', 'Sent to vicky'),
(1, 1, 1, 302.00, 'EXPENSE', '2022-01-23', 'Lunch'),
(1, 13, 1, 310.00, 'INCOME', '2022-01-23', 'From vicky'),
(1, 1, 1, 176.00, 'EXPENSE', '2022-01-23', 'Snacks with preethi and azar'),
(1, 5, 1, 200.00, 'EXPENSE', '2022-01-23', 'Badminton'),
(1, 13, 1, 2000.00, 'INCOME', '2022-01-23', 'From dad'),
(1, 1, 1, 188.00, 'EXPENSE', '2022-01-21', 'Lunch with company'),
(1, 1, 1, 37.00, 'EXPENSE', '2022-01-21', 'Snacks'),
(1, 13, 1, 200.00, 'INCOME', '2022-01-21', 'From vicky'),
(1, 1, 1, 171.00, 'EXPENSE', '2022-01-19', 'Lunch + chocolate for preethi'),
(1, 1, 1, 301.15, 'EXPENSE', '2022-01-18', 'Dinner'),
(1, 1, 1, 59.00, 'EXPENSE', '2022-01-18', 'Snack with preethi'),
(1, 1, 1, 148.00, 'EXPENSE', '2022-01-18', 'Lunch with company');
INSERT INTO `transaction` (account_id, category_id, payment_method_id, amount, transaction_type, transaction_date, description) VALUES
(1, 6, 1, 200.00, 'EXPENSE', '2022-01-18', 'To kumara'),
(1, 13, 1, 1000.00, 'INCOME', '2022-01-18', 'From dad'),
(1, 1, 1, 100.00, 'EXPENSE', '2022-01-17', 'Eve snack'),
(1, 2, 1, 1365.00, 'EXPENSE', '2022-01-15', 'Bus to Bangalore'),
(1, 13, 1, 1500.00, 'INCOME', '2022-01-15', 'From dad'),
(1, 1, 1, 70.00, 'EXPENSE', '2022-01-15', 'Snacks'),
(1, 13, 1, 170.00, 'INCOME', '2022-01-14', 'Kumara'),
(1, 13, 1, 70.00, 'INCOME', '2022-01-14', 'Siva + 100 cash'),
(1, 13, 1, 340.00, 'INCOME', '2022-01-14', 'Gundan + prasanna'),
(1, 13, 1, 240.00, 'INCOME', '2022-01-14', 'Dinesh and maddy + 100 cash'),
(1, 13, 1, 340.00, 'INCOME', '2022-01-14', 'From gowdham'),
(1, 1, 1, 1530.00, 'EXPENSE', '2022-01-14', 'Lunch pongal'),
(1, 1, 1, 66.00, 'EXPENSE', '2022-01-13', 'Dinner'),
(1, 13, 1, 1000.00, 'INCOME', '2022-01-13', 'From dad'),
(1, 2, 1, 43.00, 'EXPENSE', '2022-01-13', 'Rapido to pg'),
(1, 6, 1, 479.00, 'EXPENSE', '2022-01-12', 'Recharge by gowdham'),
(1, 1, 1, 301.75, 'EXPENSE', '2022-01-12', 'Pizza'),
(1, 13, 1, 200.00, 'INCOME', '2022-01-12', 'From kumara'),
(1, 1, 1, 135.50, 'EXPENSE', '2022-01-11', 'Lunch with not preethi'),
(1, 1, 1, 106.00, 'EXPENSE', '2022-01-10', 'Friday snacks with preethi gang'),
(1, 13, 1, 260.00, 'INCOME', '2022-01-08', 'From gowdham'),
(1, 1, 1, 535.30, 'EXPENSE', '2022-01-08', 'Lunch with gowdham'),
(1, 3, 1, 4580.00, 'EXPENSE', '2022-01-08', 'Rent'),
(1, 1, 1, 15.00, 'EXPENSE', '2022-01-07', 'Coffee + biscuit'),
(1, 13, 1, 440.00, 'INCOME', '2022-01-06', 'From barath and shakur'),
(1, 1, 1, 20.00, 'EXPENSE', '2022-01-06', 'Ketch up'),
(1, 1, 1, 877.81, 'EXPENSE', '2022-01-06', 'Dinner with roommate'),
(1, 1, 1, 10.00, 'EXPENSE', '2022-01-06', 'Bingo'),
(1, 2, 1, 42.00, 'EXPENSE', '2022-01-06', 'Rapido to pg'),
(1, 1, 1, 211.00, 'EXPENSE', '2022-01-05', 'McDonald''s with company'),
(1, 6, 1, 40.00, 'EXPENSE', '2022-01-05', 'Lended money returned to vishnu'),
(1, 6, 1, 30.00, 'EXPENSE', '2022-01-05', 'Lended money returned to kumara'),
(1, 1, 1, 354.00, 'EXPENSE', '2022-01-05', 'Jan 2nd with shakur and barath'),
(1, 6, 1, 500.00, 'EXPENSE', '2022-01-05', 'To gobi 1st 1/4th'),
(1, 6, 1, 500.00, 'EXPENSE', '2022-01-05', 'To abijith and to vicky lend money returned'),
(1, 2, 1, 60.00, 'EXPENSE', '2022-01-05', 'Refund for bus ticket'),
(1, 1, 1, 388.00, 'EXPENSE', '2022-01-05', 'Lunch with company'),
(1, 7, 1, 1400.00, 'EXPENSE', '2022-01-04', 'Arrear and reval fee'),
(1, 11, 1, 8000.00, 'INCOME', '2022-01-04', 'Salary'),
(1, 1, 1, 106.00, 'EXPENSE', '2022-01-04', 'Lunch with company'),
(1, 6, 1, 80.00, 'EXPENSE', '2022-01-04', 'To vicky'),
(1, 1, 1, 107.00, 'EXPENSE', '2022-01-04', 'Sent to preethi'),
(1, 1, 1, 10.00, 'EXPENSE', '2022-01-03', 'Dairy milk'),
(1, 13, 1, 201.00, 'INCOME', '2022-01-03', 'From barath'),
(1, 13, 1, 5.00, 'INCOME', '2022-01-03', 'From gpay'),
(1, 13, 1, 140.00, 'INCOME', '2022-01-03', 'From shakur'),
(1, 1, 1, 300.00, 'EXPENSE', '2022-01-03', 'Lunch unlimited nv'),
(1, 13, 1, 300.00, 'INCOME', '2022-01-03', 'From abi'),
(1, 6, 1, 8.00, 'EXPENSE', '2022-01-02', 'Tablet to gowdham'),
(1, 1, 1, 200.00, 'EXPENSE', '2022-01-02', 'Dinner with barath');

INSERT INTO `transaction` (account_id, category_id, payment_method_id, amount, transaction_type, transaction_date, description) VALUES
(1, 2, 1, 725.00, 'EXPENSE', '2022-01-02', 'Train to vnr'),
(1, 1, 1, 85.00, 'EXPENSE', '2022-01-01', 'Snacks'),
(1, 12, 1, 1000.00, 'INCOME', '2022-01-01', 'From dad'),
(1, 1, 1, 20.00, 'EXPENSE', '2021-12-30', 'To barath'),
(1, 2, 1, 43.00, 'EXPENSE', '2021-12-30', 'Pg to office'),
(1, 13, 1, 30.00, 'INCOME', '2021-12-30', 'From kumara'),
(1, 1, 1, 25.00, 'EXPENSE', '2021-12-30', 'Horlicks + kolakattai'),
(1, 2, 1, 199.00, 'EXPENSE', '2021-12-30', 'Bommasandra to pg'),
(1, 13, 1, 250.00, 'INCOME', '2021-12-30', 'From Deepak'),
(1, 1, 1, 20.00, 'EXPENSE', '2021-12-30', 'Water'),
(1, 13, 1, 20.00, 'INCOME', '2021-12-30', 'From abi'),
(1, 2, 1, 286.00, 'EXPENSE', '2021-12-30', 'Rapido + toll'),
(1, 13, 1, 250.00, 'INCOME', '2021-12-30', 'From Deepak'),
(1, 1, 1, 14.00, 'EXPENSE', '2021-12-28', 'Coffee and thattai'),
(1, 1, 1, 115.00, 'EXPENSE', '2021-12-27', 'Lunch with barath'),
(1, 13, 1, 80.00, 'INCOME', '2021-12-27', 'From vicky'),
(1, 13, 1, 40.00, 'INCOME', '2021-12-27', 'From ganesan'),
(1, 1, 1, 50.00, 'EXPENSE', '2021-12-27', 'Coconut water with stu'),
(1, 1, 1, 504.00, 'EXPENSE', '2021-12-25', 'Dinner with barath'),
(1, 2, 1, 306.00, 'EXPENSE', '2021-12-25', 'Cab'),
(1, 9, 1, 400.00, 'EXPENSE', '2021-12-25', 'Books'),
(1, 1, 1, 30.00, 'EXPENSE', '2021-12-25', 'Corn'),
(1, 1, 1, 30.00, 'EXPENSE', '2021-12-25', 'Water'),
(1, 1, 1, 40.00, 'EXPENSE', '2021-12-25', 'Milk with bharath'),
(1, 5, 1, 150.00, 'EXPENSE', '2021-12-24', 'Beer'),
(1, 1, 1, 262.00, 'EXPENSE', '2021-12-24', 'Lunch with company'),
(1, 1, 1, 15.00, 'EXPENSE', '2021-12-23', 'Lemon tea with company'),
(1, 1, 1, 32.00, 'EXPENSE', '2021-12-23', 'Puffs and coffee'),
(1, 1, 1, 239.00, 'EXPENSE', '2021-12-21', 'Dinner with barath'),
(1, 1, 1, 25.00, 'EXPENSE', '2021-12-21', 'Puffs'),
(1, 1, 1, 18.00, 'EXPENSE', '2021-12-21', 'Bun'),
(1, 1, 1, 80.00, 'EXPENSE', '2021-12-20', 'Milk with bharath'),
(1, 2, 1, 80.00, 'EXPENSE', '2021-12-20', 'Taxi'),
(1, 1, 1, 20.00, 'EXPENSE', '2021-12-20', 'Snacks'),
(1, 1, 1, 20.00, 'EXPENSE', '2021-12-20', 'Water'),
(1, 1, 1, 85.00, 'EXPENSE', '2021-12-20', 'Lunch with barath'),
(1, 1, 1, 40.00, 'EXPENSE', '2021-12-20', 'Milk with bharath'),
(1, 6, 1, 100.00, 'EXPENSE', '2021-12-19', 'To siva'),
(1, 6, 1, 100.00, 'EXPENSE', '2021-12-18', 'To kumara'),
(1, 6, 1, 200.00, 'EXPENSE', '2021-12-18', 'To abijith'),
(1, 1, 1, 113.00, 'EXPENSE', '2021-12-18', 'To rahul'),
(1, 12, 1, 1000.00, 'INCOME', '2021-12-18', 'From dad'),
(1, 13, 1, 400.00, 'INCOME', '2021-12-18', 'Lended money'),
(1, 5, 1, 363.72, 'EXPENSE', '2021-12-18', 'Spiderman'),
(1, 1, 1, 160.00, 'EXPENSE', '2021-12-18', 'Lunch'),
(1, 1, 1, 70.00, 'EXPENSE', '2021-12-17', 'Milk with bharath'),
(1, 1, 1, 110.00, 'EXPENSE', '2021-12-17', 'Lunch with company'),
(1, 6, 1, 50.00, 'EXPENSE', '2021-12-17', 'Gave to gowdham'),
(1, 1, 1, 30.00, 'EXPENSE', '2021-12-16', 'Egg'),
(1, 1, 1, 20.00, 'EXPENSE', '2021-12-16', 'Panipoori');

INSERT INTO `transaction` (account_id, category_id, payment_method_id, amount, transaction_type, transaction_date, description) VALUES
(1, 1, 1, 30.00, 'EXPENSE', '2021-12-16', 'Lunch'),
(1, 1, 1, 110.00, 'EXPENSE', '2021-12-16', 'Milk with bharath'),
(1, 1, 1, 40.00, 'EXPENSE', '2021-12-14', 'Lunch'),
(1, 1, 1, 75.00, 'EXPENSE', '2021-12-14', 'Snacks'),
(1, 1, 1, 80.00, 'EXPENSE', '2021-12-14', 'Panipoori'),
(1, 1, 1, 74.00, 'EXPENSE', '2021-12-14', 'Snacks'),
(1, 1, 1, 65.00, 'EXPENSE', '2021-12-14', 'Milk with bharath'),
(1, 1, 1, 25.00, 'EXPENSE', '2021-12-12', 'Milk with bharath'),
(1, 12, 1, 1000.00, 'INCOME', '2021-12-11', 'From dad'),
(1, 13, 1, 240.00, 'INCOME', '2021-12-11', 'From stu'),
(1, 1, 1, 241.00, 'EXPENSE', '2021-12-10', 'Shopping'),
(1, 1, 1, 195.00, 'EXPENSE', '2021-12-10', 'Momos'),
(1, 1, 1, 40.00, 'EXPENSE', '2021-12-09', 'Snack with bharath'),
(1, 1, 1, 280.00, 'EXPENSE', '2021-12-09', 'Lunch with company'),
(1, 1, 1, 25.00, 'EXPENSE', '2021-12-09', 'Milk with bharath'),
(1, 1, 1, 110.00, 'EXPENSE', '2021-12-09', 'Breakfast with stu'),
(1, 1, 1, 100.00, 'EXPENSE', '2021-12-08', 'Lunch with stu'),
(2, 1, 2, 1120.72, 'EXPENSE', '2021-12-08', '5 star'),
(1, 1, 1, 10.00, 'EXPENSE', '2021-12-08', 'Milk'),
(1, 1, 1, 25.00, 'EXPENSE', '2021-12-07', 'Milk with bharath'),
(1, 1, 1, 15.00, 'EXPENSE', '2021-12-07', 'Horlicks'),
(1, 1, 1, 25.00, 'EXPENSE', '2021-12-06', 'Milk with bharath'),
(1, 4, 1, 500.00, 'EXPENSE', '2021-12-06', 'Shoe'),
(1, 4, 1, 140.00, 'EXPENSE', '2021-12-06', 'Cap'),
(1, 1, 1, 150.00, 'EXPENSE', '2021-12-06', 'Lunch with stu'),
(1, 1, 1, 25.00, 'EXPENSE', '2021-12-05', 'Milk with bharath'),
(1, 4, 1, 1800.00, 'EXPENSE', '2021-12-05', 'Full hand and a hoodie'),
(1, 3, 1, 4800.00, 'EXPENSE', '2021-12-05', 'Rent'),
(1, 12, 1, 8000.00, 'INCOME', '2021-12-05', 'From dad'),
(1, 1, 1, 324.00, 'EXPENSE', '2021-12-04', 'Dinner'),
(1, 1, 1, 65.00, 'EXPENSE', '2021-12-04', 'Snack'),
(1, 6, 1, 30.00, 'EXPENSE', '2021-12-04', 'For company'),
(1, 1, 1, 200.00, 'EXPENSE', '2021-12-04', 'Breakfast'),
(1, 1, 1, 25.00, 'EXPENSE', '2021-12-03', 'Milk with bharath'),
(1, 4, 1, 130.00, 'EXPENSE', '2021-12-03', 'Belt'),
(1, 4, 1, 20.00, 'EXPENSE', '2021-12-03', 'Mask'),
(1, 1, 1, 40.00, 'EXPENSE', '2021-12-03', 'Snack'),
(1, 12, 1, 1000.00, 'INCOME', '2021-12-03', 'From dad'),
(1, 1, 1, 504.00, 'EXPENSE', '2021-12-02', 'Ice cream'),
(1, 1, 1, 75.00, 'EXPENSE', '2021-12-02', 'Vadapaav'),
(1, 8, 1, 196.00, 'EXPENSE', '2021-12-01', 'Showergel'),
(1, 1, 1, 160.00, 'EXPENSE', '2021-12-01', 'Lunch with company'),
(1, 10, 1, 115.00, 'EXPENSE', '2021-11-30', 'Bharath birthday'),
(1, 1, 1, 128.00, 'EXPENSE', '2021-11-30', 'Lunch with company'),
(1, 1, 1, 70.00, 'EXPENSE', '2021-11-30', 'Breakfast'),
(1, 1, 1, 40.00, 'EXPENSE', '2021-11-29', 'Lunch with company'),
(1, 1, 1, 50.00, 'EXPENSE', '2021-11-29', 'Dinner'),
(1, 1, 1, 40.00, 'EXPENSE', '2021-11-29', 'Panipoori'),
(1, 1, 1, 40.00, 'EXPENSE', '2021-11-29', 'Breakfast'),
(1, 1, 1, 94.00, 'EXPENSE', '2021-11-28', 'Snack');

INSERT INTO `transaction` (account_id, category_id, payment_method_id, amount, transaction_type, transaction_date, description) VALUES
(1, 1, 1, 269.40, 'EXPENSE', '2021-11-28', 'Zomato'),
(1, 1, 1, 120.00, 'EXPENSE', '2021-11-27', 'Dinner with gowdham'),
(1, 1, 1, 130.00, 'EXPENSE', '2021-11-27', 'Dinner with gowdham'),
(1, 2, 1, 35.00, 'EXPENSE', '2021-11-27', 'Rapido'),
(1, 1, 1, 75.00, 'EXPENSE', '2021-11-27', 'Lunch with company'),
(1, 12, 1, 2000.00, 'INCOME', '2021-11-27', 'From dad'),
(1, 1, 1, 30.00, 'EXPENSE', '2021-11-27', 'Breakfast'),
(1, 1, 1, 150.00, 'EXPENSE', '2021-11-26', 'Beer'),
(1, 1, 1, 102.00, 'EXPENSE', '2021-11-26', 'Snack'),
(1, 1, 1, 40.00, 'EXPENSE', '2021-11-26', 'Panipoori'),
(1, 14, 1, 3.00, 'INCOME', '2021-11-26', 'Cashback'),
(1, 1, 1, 150.00, 'EXPENSE', '2021-11-26', 'Lunch with company'),
(1, 1, 1, 60.00, 'EXPENSE', '2021-11-26', 'Breakfast'),
(1, 1, 1, 145.00, 'EXPENSE', '2021-11-25', 'Lunch with company'),
(1, 2, 1, 58.00, 'EXPENSE', '2021-11-25', 'Rapido'),
(1, 1, 1, 95.00, 'EXPENSE', '2021-11-25', 'Dinner'),
(1, 1, 1, 15.00, 'EXPENSE', '2021-11-24', 'Snack'),
(1, 1, 1, 70.00, 'EXPENSE', '2021-11-24', 'Dinner'),
(1, 1, 1, 20.00, 'EXPENSE', '2021-11-24', 'Panipoori'),
(1, 2, 1, 58.00, 'EXPENSE', '2021-11-24', 'Rapido'),
(1, 2, 1, 50.00, 'EXPENSE', '2021-11-23', 'Rapido'),
(1, 1, 1, 179.00, 'EXPENSE', '2021-11-23', 'Dinner'),
(1, 1, 1, 90.00, 'EXPENSE', '2021-11-22', 'Dinner'),
(1, 1, 1, 97.00, 'EXPENSE', '2021-11-22', 'Lunch with company'),
(1, 2, 1, 130.00, 'EXPENSE', '2021-11-21', 'Rapido'),
(1, 1, 1, 875.00, 'EXPENSE', '2021-11-21', 'Lunch'),
(1, 13, 1, 2000.00, 'INCOME', '2021-11-21', 'Got from gobi');


INSERT INTO transaction_tag (transaction_id, tag_id) VALUES
(4, 2),   -- Metro -> Travel
(8, 3),   -- Pizza -> Foodie
(21, 5),  -- Hoodie -> Essentials
(24, 2),  -- Auto to laxmi mills -> Travel
(25, 2),  -- Travel cbe to chn -> Travel
(32, 2),  -- Bus ticket -> Travel
(41, 3),  -- Kfc dinner -> Foodie
(42, 4),  -- Games -> Friends
(43, 4),  -- Dinner with aravind -> Friends
(47, 4),  -- Dinner with aravind -> Friends
(90, 1),  -- Arrear and reval fee -> College
(98, 4),  -- Dinner with barath -> Friends
(139, 4), -- Lunch with company -> Friends
(151, 1), -- Books -> College
(157, 4); -- Beer -> Friends


INSERT INTO goal_contribution (goal_id, transaction_id, amount, contribution_date) VALUES
(1, 91, 5000.00, '2022-01-05'),   -- From Salary
(1, 46, 7000.00, '2022-02-13'),   -- From Dad allowance
(2, 55, 3000.00, '2022-02-07'),   -- Emergency buffer
(2, 7, 5000.00, '2022-03-02');    -- Emergency buffer

SET SQL_SAFE_UPDATES = 0;

UPDATE account a
SET a.current_balance = a.opening_balance + COALESCE((
    SELECT SUM(
        CASE 
            WHEN t.transaction_type = 'INCOME' THEN t.amount 
            WHEN t.transaction_type = 'EXPENSE' THEN -t.amount 
            ELSE 0 
        END
    )
    FROM `transaction` t
    WHERE t.account_id = a.account_id
), 0)
WHERE a.account_id > 0;

SET SQL_SAFE_UPDATES = 1;

SELECT 'users' AS table_name, COUNT(*) AS record_count FROM users
UNION ALL
SELECT 'household', COUNT(*) FROM household
UNION ALL
SELECT 'household_member', COUNT(*) FROM household_member
UNION ALL
SELECT 'account', COUNT(*) FROM account
UNION ALL
SELECT 'category', COUNT(*) FROM category
UNION ALL
SELECT 'payment_method', COUNT(*) FROM payment_method
UNION ALL
SELECT 'tag', COUNT(*) FROM tag
UNION ALL
SELECT 'transaction', COUNT(*) FROM `transaction`
UNION ALL
SELECT 'transaction_tag', COUNT(*) FROM transaction_tag
UNION ALL
SELECT 'recurring_rule', COUNT(*) FROM recurring_rule
UNION ALL
SELECT 'budget', COUNT(*) FROM budget
UNION ALL
SELECT 'budget_override', COUNT(*) FROM budget_override
UNION ALL
SELECT 'savings_goal', COUNT(*) FROM savings_goal
UNION ALL
SELECT 'goal_contribution', COUNT(*) FROM goal_contribution;
