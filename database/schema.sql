-- ============================================================
-- Personal Expense Analyzer for Students — MySQL schema
-- Team Pentagon · Woosong University · Freshmen Capstone Design
--
-- Run once (MySQL 8.0.16+ recommended so CHECK constraints are enforced):
--   mysql -u root -p < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS expense_analyzer
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE expense_analyzer;

-- ------------------------------------------------------------
-- Users: one row per registered student
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  full_name      VARCHAR(100)  NOT NULL,
  email          VARCHAR(255)  NOT NULL,
  password_hash  VARCHAR(255)  NOT NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email)
) ENGINE = InnoDB;

-- ------------------------------------------------------------
-- Categories: user_id IS NULL  -> system default (shared by everyone)
--             user_id NOT NULL -> custom category owned by one student
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  category_id    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED  NULL,
  category_name  VARCHAR(50)   NOT NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_categories_user_name (user_id, category_name),
  CONSTRAINT fk_categories_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- ------------------------------------------------------------
-- Expenses: every transaction a student records
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  expense_id     INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED   NOT NULL,
  category_id    INT UNSIGNED   NOT NULL,
  amount         DECIMAL(12, 2) NOT NULL,
  expense_date   DATE           NOT NULL,
  note           VARCHAR(255)   NULL,
  created_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (expense_id),
  KEY idx_expenses_user_date (user_id, expense_date),
  KEY idx_expenses_category (category_id),
  CONSTRAINT chk_expenses_amount CHECK (amount > 0),
  CONSTRAINT fk_expenses_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE,
  -- CASCADE so deleting a user (and their custom categories) works.
  -- The API moves a category's expenses to "Other" before deleting it.
  CONSTRAINT fk_expenses_category
    FOREIGN KEY (category_id) REFERENCES categories (category_id)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- ------------------------------------------------------------
-- Budgets: category_id IS NULL -> overall monthly budget
--          category_id NOT NULL -> budget for one category
-- category_key turns NULL into 0 so the UNIQUE key also stops
-- duplicate overall budgets for the same month. It is VIRTUAL because
-- MySQL forbids ON DELETE CASCADE on the base column of a STORED one.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
  budget_id      INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED      NOT NULL,
  category_id    INT UNSIGNED      NULL,
  month          TINYINT UNSIGNED  NOT NULL,
  year           SMALLINT UNSIGNED NOT NULL,
  amount         DECIMAL(12, 2)    NOT NULL,
  created_at     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  category_key   INT UNSIGNED AS (IFNULL(category_id, 0)) VIRTUAL,
  PRIMARY KEY (budget_id),
  UNIQUE KEY uq_budgets_period (user_id, category_key, month, year),
  KEY idx_budgets_user_period (user_id, year, month),
  CONSTRAINT chk_budgets_month  CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT chk_budgets_year   CHECK (year BETWEEN 2000 AND 2100),
  CONSTRAINT chk_budgets_amount CHECK (amount > 0),
  CONSTRAINT fk_budgets_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_budgets_category
    FOREIGN KEY (category_id) REFERENCES categories (category_id)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- ------------------------------------------------------------
-- Default categories (shared, user_id = NULL). Safe to re-run.
-- ------------------------------------------------------------
INSERT INTO categories (user_id, category_name)
SELECT NULL, d.name
FROM (
  SELECT 'Food' AS name UNION ALL
  SELECT 'Transportation' UNION ALL
  SELECT 'Shopping' UNION ALL
  SELECT 'Study' UNION ALL
  SELECT 'Entertainment' UNION ALL
  SELECT 'Housing' UNION ALL
  SELECT 'Other'
) AS d
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.user_id IS NULL AND c.category_name = d.name
);
