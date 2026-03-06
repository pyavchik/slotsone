-- 007_topup_transactions.sql
-- Allow admin top-up transactions: add 'topup' type and make round_id nullable.

ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_type_check CHECK (type IN ('bet', 'win', 'topup'));

ALTER TABLE transactions
  ALTER COLUMN round_id DROP NOT NULL;
