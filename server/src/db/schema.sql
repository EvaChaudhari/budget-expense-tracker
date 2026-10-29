-- Ledgr database schema
-- Applied automatically on first Docker container start

CREATE DATABASE IF NOT EXISTS ledgr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ledgr;

-- ─── Settings ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS settings (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  week_start      ENUM('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL DEFAULT 'Sunday',
  currency_country VARCHAR(100) NOT NULL DEFAULT 'Malaysia',
  currency_code   VARCHAR(10)  NOT NULL DEFAULT 'MYR',
  currency_symbol VARCHAR(10)  NOT NULL DEFAULT 'RM',
  unit_position   ENUM('prefix','suffix') NOT NULL DEFAULT 'prefix',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO settings (id, week_start, currency_country, currency_code, currency_symbol, unit_position)
VALUES (1, 'Sunday', 'Malaysia', 'MYR', 'RM', 'prefix');

-- ─── Categories ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(100) NOT NULL,
  type  ENUM('income','expense') NOT NULL,
  icon  VARCHAR(50)  NOT NULL DEFAULT 'tag',
  UNIQUE KEY uq_name_type (name, type)
);

-- Drop legacy color column if it exists from earlier versions
SET @col_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'categories' AND column_name = 'color');
SET @sql := IF(@col_exists > 0, 'ALTER TABLE categories DROP COLUMN color', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO categories (name, type, icon) VALUES
  ('Salary',       'income',  'briefcase'),
  ('Freelance',    'income',  'laptop'),
  ('Investment',   'income',  'trending-up'),
  ('Gift',         'income',  'gift'),
  ('Refund',       'income',  'rotate-ccw'),
  ('Food & Dining','expense', 'utensils'),
  ('Transport',    'expense', 'car'),
  ('Shopping',     'expense', 'shopping-bag'),
  ('Groceries',    'expense', 'shopping-cart'),
  ('Bills',        'expense', 'receipt'),
  ('Entertainment','expense', 'clapperboard'),
  ('Health',       'expense', 'heart-pulse');

-- ─── Account Groups ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS account_groups (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(50)  NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0
);

INSERT IGNORE INTO account_groups (id, name, sort_order) VALUES
  (1, 'Cash',     0),
  (2, 'Bank',     1),
  (3, 'Card',     2),
  (4, 'E-wallet', 3);

-- ─── Accounts ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounts (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  type       VARCHAR(50)  NOT NULL,
  icon       VARCHAR(50)  NOT NULL DEFAULT 'wallet',
  color      VARCHAR(20)  NOT NULL DEFAULT '#7b5cf0',
  balance    DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  group_id   INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_acc_group FOREIGN KEY (group_id) REFERENCES account_groups(id) ON DELETE SET NULL
);

INSERT IGNORE INTO accounts (id, name, type, icon, color, balance, group_id) VALUES
  (1, 'Cash',            'Wallet',           'banknote',    '#22c55e',  1240.00, 1),
  (2, 'Maybank Savings', 'Savings account',  'piggy-bank',  '#f59e0b', 18500.00, 2),
  (3, 'CIMB Current',    'Current account',  'landmark',    '#06b6d4',  4320.50, 2),
  (4, 'Touch ''n Go',    'E-wallet',         'smartphone',  '#7b5cf0',   380.00, 4),
  (5, 'Maybank Credit',  'Credit card',      'credit-card', '#ef4444', -1150.00, 3);

-- ─── Budgets ─────────────────────────────────────────────────────────────────

-- Time-series of default monthly limits.
-- Effective default for (year, month) = latest row where (start_year, start_month) <= (year, month).
-- This lets "update default in July" leave June's budget unchanged.
CREATE TABLE IF NOT EXISTS budget_defaults (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  start_year  SMALLINT UNSIGNED NOT NULL,
  start_month TINYINT UNSIGNED NOT NULL,  -- 1-indexed
  amount      DECIMAL(15,2) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cat_start (category_id, start_year, start_month),
  CONSTRAINT fk_bdef_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Month-specific overrides — take precedence over the default for that month only
CREATE TABLE IF NOT EXISTS budget_overrides (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  year        SMALLINT UNSIGNED NOT NULL,
  month       TINYINT UNSIGNED NOT NULL,  -- 1-indexed
  amount      DECIMAL(15,2) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cat_ym (category_id, year, month),
  CONSTRAINT fk_bover_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

INSERT IGNORE INTO budget_defaults (category_id, start_year, start_month, amount) VALUES
  (6,  2026, 6,  20.00),   -- Food & Dining:  RM 20/mo from Jun 2026
  (7,  2026, 6,  40.00),   -- Transport:      RM 40/mo from Jun 2026
  (9,  2026, 6,  50.00),   -- Groceries:      RM 50/mo from Jun 2026
  (11, 2026, 6, 150.00);   -- Entertainment:  RM 150/mo from Jun 2026

-- ─── Transactions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id  INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  amount      DECIMAL(15,2) NOT NULL,
  note        VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT         NULL DEFAULT NULL,
  tx_date     DATE NOT NULL,
  tx_time     TIME NOT NULL DEFAULT '00:00:00',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tx_account  FOREIGN KEY (account_id)  REFERENCES accounts(id)   ON DELETE RESTRICT,
  CONSTRAINT fk_tx_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- Add description column if missing from earlier versions
SET @col_exists := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'transactions' AND column_name = 'description');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE transactions ADD COLUMN description TEXT NULL DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO transactions (id, account_id, category_id, amount, note, tx_date, tx_time) VALUES
  (1,  3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd',   '2026-06-16', '09:00:00'),
  (2,  5, 11,  -17.90, 'Netflix subscription',            '2026-06-16', '11:00:00'),
  (3,  1, 6,    -9.90, 'ZUS Coffee',                      '2026-06-16', '15:30:00'),
  (4,  4, 7,   -38.00, 'Shell petrol',                    '2026-06-16', '18:00:00'),
  (5,  4, 7,    -9.00, 'Grab to office',                  '2026-06-17', '08:10:00'),
  (6,  1, 6,   -12.50, 'Nasi Lemak Antarabangsa',         '2026-06-17', '08:30:00'),
  (7,  3, 9,   -65.80, 'Jaya Grocer · weekly shop',       '2026-06-17', '13:15:00');

-- Historical seed: 2025 full year + 2026 Jan–May (IDs 8–126)
INSERT IGNORE INTO transactions (id, account_id, category_id, amount, note, tx_date, tx_time) VALUES
-- 2025 January
(8,  3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd',  '2025-01-15', '09:00:00'),
(9,  1, 6,  -180.50, 'Food & dining',                  '2025-01-08', '13:00:00'),
(10, 4, 9,  -310.00, 'Jaya Grocer weekly shop',        '2025-01-11', '14:30:00'),
(11, 4, 7,   -95.00, 'Shell petrol + Grab',            '2025-01-20', '08:00:00'),
(12, 5, 10, -178.00, 'TNB + Unifi bill',               '2025-01-03', '09:00:00'),
(13, 5, 11,  -89.00, 'Netflix + GSC movies',           '2025-01-25', '20:00:00'),
(14, 5, 8,  -420.00, 'Parkson clearance sale',         '2025-01-27', '15:30:00'),
-- 2025 February
(15, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd',  '2025-02-14', '09:00:00'),
(16, 1, 6,  -165.00, 'Food & dining',                  '2025-02-08', '12:30:00'),
(17, 4, 9,  -285.00, 'Village Grocer',                 '2025-02-12', '15:00:00'),
(18, 4, 7,  -102.00, 'Shell petrol + Grab',            '2025-02-18', '08:00:00'),
(19, 5, 10, -192.00, 'TNB + Unifi bill',               '2025-02-04', '09:00:00'),
(20, 5, 11,  -45.00, 'Spotify + streaming',            '2025-02-22', '19:00:00'),
(21, 3, 2,  1800.00, 'Freelance web project',          '2025-02-28', '17:00:00'),
-- 2025 March
(22, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd',  '2025-03-14', '09:00:00'),
(23, 1, 6,  -210.00, 'Food & dining',                  '2025-03-07', '13:00:00'),
(24, 4, 9,  -330.00, 'Jaya Grocer weekly shop',        '2025-03-13', '14:00:00'),
(25, 4, 7,   -88.00, 'Shell petrol + Grab',            '2025-03-20', '08:00:00'),
(26, 5, 10, -165.00, 'TNB + Unifi bill',               '2025-03-03', '09:00:00'),
(27, 5, 11, -120.00, 'GSC + bowling',                  '2025-03-21', '19:30:00'),
(28, 5, 12, -280.00, 'Dental checkup',                 '2025-03-28', '11:00:00'),
-- 2025 April
(29, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd',  '2025-04-15', '09:00:00'),
(30, 1, 6,  -195.00, 'Food & dining',                  '2025-04-06', '12:30:00'),
(31, 4, 9,  -260.00, 'Village Grocer',                 '2025-04-10', '14:30:00'),
(32, 4, 7,  -115.00, 'Shell petrol + Grab',            '2025-04-19', '08:00:00'),
(33, 5, 10, -198.00, 'TNB + Unifi bill',               '2025-04-02', '09:00:00'),
(34, 5, 11,  -65.00, 'Spotify + movies',               '2025-04-23', '20:00:00'),
(35, 5, 8,  -350.00, 'Zara Raya outfit',               '2025-04-26', '16:00:00'),
-- 2025 May
(36, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd',  '2025-05-15', '09:00:00'),
(37, 1, 6,  -220.00, 'Food & dining',                  '2025-05-08', '13:00:00'),
(38, 4, 9,  -295.00, 'Jaya Grocer weekly shop',        '2025-05-12', '14:00:00'),
(39, 4, 7,  -130.00, 'Shell petrol + Grab',            '2025-05-20', '08:00:00'),
(40, 5, 10, -175.00, 'TNB + Unifi bill',               '2025-05-05', '09:00:00'),
(41, 5, 11,  -95.00, 'Netflix + GSC',                  '2025-05-22', '20:00:00'),
(42, 3, 2,  2200.00, 'Freelance mobile app',           '2025-05-30', '17:00:00'),
-- 2025 June
(43, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd',  '2025-06-13', '09:00:00'),
(44, 1, 6,  -185.00, 'Food & dining',                  '2025-06-07', '12:30:00'),
(45, 4, 9,  -315.00, 'Village Grocer',                 '2025-06-11', '14:30:00'),
(46, 4, 7,   -99.00, 'Shell petrol + Grab',            '2025-06-19', '08:00:00'),
(47, 5, 10, -188.00, 'TNB + Unifi bill',               '2025-06-04', '09:00:00'),
(48, 5, 11,  -55.00, 'Spotify + streaming',            '2025-06-24', '19:00:00'),
(49, 5, 8,  -280.00, 'Mid Valley shopping',            '2025-06-27', '15:00:00'),
-- 2025 July
(50, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd',  '2025-07-15', '09:00:00'),
(51, 1, 6,  -240.00, 'Food & dining',                  '2025-07-09', '13:00:00'),
(52, 4, 9,  -350.00, 'Jaya Grocer weekly shop',        '2025-07-14', '14:00:00'),
(53, 4, 7,  -110.00, 'Shell petrol + Grab',            '2025-07-21', '08:00:00'),
(54, 5, 10, -201.00, 'TNB + Unifi bill',               '2025-07-03', '09:00:00'),
(55, 5, 11, -130.00, 'GSC + karaoke',                  '2025-07-25', '20:00:00'),
(56, 5, 12, -150.00, 'General physician visit',        '2025-07-30', '10:00:00'),
-- 2025 August
(57, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd',  '2025-08-15', '09:00:00'),
(58, 1, 6,  -175.00, 'Food & dining',                  '2025-08-07', '12:30:00'),
(59, 4, 9,  -290.00, 'Village Grocer',                 '2025-08-13', '14:30:00'),
(60, 4, 7,   -95.00, 'Shell petrol + Grab',            '2025-08-20', '08:00:00'),
(61, 5, 10, -170.00, 'TNB + Unifi bill',               '2025-08-04', '09:00:00'),
(62, 5, 11,  -85.00, 'Netflix + bowling',              '2025-08-22', '19:00:00'),
(63, 3, 2,  1500.00, 'Freelance dashboard project',    '2025-08-29', '17:00:00'),
-- 2025 September
(64, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd',  '2025-09-12', '09:00:00'),
(65, 1, 6,  -200.00, 'Food & dining',                  '2025-09-06', '13:00:00'),
(66, 4, 9,  -340.00, 'Jaya Grocer weekly shop',        '2025-09-10', '14:00:00'),
(67, 4, 7,  -125.00, 'Shell petrol + Grab',            '2025-09-18', '08:00:00'),
(68, 5, 10, -195.00, 'TNB + Unifi bill',               '2025-09-03', '09:00:00'),
(69, 5, 11,  -70.00, 'Spotify + movies',               '2025-09-24', '20:00:00'),
(70, 5, 8,  -480.00, 'Suria KLCC shopping',            '2025-09-27', '15:30:00'),
-- 2025 October
(71, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd',  '2025-10-15', '09:00:00'),
(72, 1, 6,  -215.00, 'Food & dining',                  '2025-10-08', '12:30:00'),
(73, 4, 9,  -305.00, 'Village Grocer',                 '2025-10-12', '14:30:00'),
(74, 4, 7,  -105.00, 'Shell petrol + Grab',            '2025-10-20', '08:00:00'),
(75, 5, 10, -182.00, 'TNB + Unifi bill',               '2025-10-05', '09:00:00'),
(76, 5, 11, -110.00, 'GSC + streaming',                '2025-10-23', '20:00:00'),
(77, 5, 12, -220.00, 'Eye checkup + new glasses',      '2025-10-28', '11:00:00'),
-- 2025 November
(78, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd',  '2025-11-14', '09:00:00'),
(79, 1, 6,  -190.00, 'Food & dining',                  '2025-11-07', '13:00:00'),
(80, 4, 9,  -270.00, 'Jaya Grocer weekly shop',        '2025-11-12', '14:00:00'),
(81, 4, 7,  -140.00, 'Shell petrol + Grab',            '2025-11-19', '08:00:00'),
(82, 5, 10, -210.00, 'TNB + Unifi bill',               '2025-11-04', '09:00:00'),
(83, 5, 11, -160.00, 'Concert tickets',                '2025-11-25', '20:00:00'),
(84, 3, 2,  2500.00, 'Freelance e-commerce site',      '2025-11-29', '17:00:00'),
-- 2025 December
(85, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd',  '2025-12-13', '09:00:00'),
(86, 1, 6,  -310.00, 'Food & dining (year-end)',        '2025-12-07', '13:00:00'),
(87, 4, 9,  -420.00, 'Jaya Grocer festive stock',      '2025-12-12', '14:00:00'),
(88, 4, 7,  -135.00, 'Shell petrol + Grab',            '2025-12-20', '08:00:00'),
(89, 5, 10, -190.00, 'TNB + Unifi bill',               '2025-12-05', '09:00:00'),
(90, 5, 11, -250.00, 'Year-end party + events',        '2025-12-24', '20:00:00'),
(91, 5, 8,  -680.00, 'Christmas + holiday gifts',      '2025-12-22', '15:00:00'),
-- 2026 January
(92,  3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd', '2026-01-15', '09:00:00'),
(93,  1, 6,  -200.00, 'Food & dining',                 '2026-01-08', '13:00:00'),
(94,  4, 9,  -320.00, 'Village Grocer',                '2026-01-11', '14:30:00'),
(95,  4, 7,  -108.00, 'Shell petrol + Grab',           '2026-01-20', '08:00:00'),
(96,  5, 10, -185.00, 'TNB + Unifi bill',              '2026-01-04', '09:00:00'),
(97,  5, 11,  -75.00, 'Netflix + movies',              '2026-01-23', '20:00:00'),
(98,  5, 8,  -380.00, 'CNY new clothes shopping',      '2026-01-27', '15:00:00'),
-- 2026 February
(99,  3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd', '2026-02-13', '09:00:00'),
(100, 1, 6,  -230.00, 'Food & dining (CNY)',           '2026-02-07', '13:00:00'),
(101, 4, 9,  -360.00, 'Jaya Grocer CNY groceries',     '2026-02-10', '14:00:00'),
(102, 4, 7,   -95.00, 'Shell petrol + Grab',           '2026-02-18', '08:00:00'),
(103, 5, 10, -175.00, 'TNB + Unifi bill',              '2026-02-03', '09:00:00'),
(104, 5, 11, -180.00, 'CNY activities + outings',      '2026-02-22', '19:00:00'),
(105, 3, 2,  1200.00, 'Freelance landing page',        '2026-02-28', '17:00:00'),
-- 2026 March
(106, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd', '2026-03-14', '09:00:00'),
(107, 1, 6,  -185.00, 'Food & dining',                 '2026-03-07', '12:30:00'),
(108, 4, 9,  -295.00, 'Village Grocer',                '2026-03-12', '14:30:00'),
(109, 4, 7,  -112.00, 'Shell petrol + Grab',           '2026-03-20', '08:00:00'),
(110, 5, 10, -190.00, 'TNB + Unifi bill',              '2026-03-04', '09:00:00'),
(111, 5, 11,  -90.00, 'Netflix + GSC',                 '2026-03-23', '20:00:00'),
(112, 5, 12, -180.00, 'GP visit + medication',         '2026-03-28', '11:00:00'),
-- 2026 April
(113, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd', '2026-04-15', '09:00:00'),
(114, 1, 6,  -205.00, 'Food & dining',                 '2026-04-08', '13:00:00'),
(115, 4, 9,  -310.00, 'Jaya Grocer weekly shop',       '2026-04-11', '14:00:00'),
(116, 4, 7,  -120.00, 'Shell petrol + Grab',           '2026-04-19', '08:00:00'),
(117, 5, 10, -205.00, 'TNB + Unifi bill',              '2026-04-03', '09:00:00'),
(118, 5, 11,  -65.00, 'Spotify + streaming',           '2026-04-24', '20:00:00'),
(119, 3, 3,   800.00, 'ASB dividend payout',           '2026-04-30', '10:00:00'),
-- 2026 May
(120, 3, 1,  5200.00, 'Monthly salary — Acme Sdn Bhd', '2026-05-15', '09:00:00'),
(121, 1, 6,  -195.00, 'Food & dining',                 '2026-05-07', '13:00:00'),
(122, 4, 9,  -280.00, 'Village Grocer',                '2026-05-12', '14:30:00'),
(123, 4, 7,  -100.00, 'Shell petrol + Grab',           '2026-05-20', '08:00:00'),
(124, 5, 10, -178.00, 'TNB + Unifi bill',              '2026-05-05', '09:00:00'),
(125, 5, 11,  -88.00, 'Netflix + GSC',                 '2026-05-22', '20:00:00'),
(126, 5, 8,  -290.00, 'Pavilion shopping',             '2026-05-28', '15:30:00');
