-- Migration 001: lets MySQL delete a user who has custom categories.
-- Only needed for databases created with the first version of schema.sql
-- (fresh installs from the current schema.sql already include this).
--   mysql -u root -p expense_analyzer < database/migrations/001_fix_cascade_deletes.sql
USE expense_analyzer;

-- Expenses: cascade when a category is deleted (the API moves a category's
-- expenses to "Other" first, so in normal use nothing is lost).
ALTER TABLE expenses
  DROP FOREIGN KEY fk_expenses_category;
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_category
    FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE CASCADE;

-- Budgets: a VIRTUAL generated column (a STORED one forbids CASCADE).
ALTER TABLE budgets
  DROP FOREIGN KEY fk_budgets_category;
ALTER TABLE budgets
  DROP INDEX uq_budgets_period,
  DROP COLUMN category_key;
ALTER TABLE budgets
  ADD COLUMN category_key INT UNSIGNED AS (IFNULL(category_id, 0)) VIRTUAL,
  ADD UNIQUE KEY uq_budgets_period (user_id, category_key, month, year),
  ADD CONSTRAINT fk_budgets_category
    FOREIGN KEY (category_id) REFERENCES categories (category_id) ON DELETE CASCADE;
