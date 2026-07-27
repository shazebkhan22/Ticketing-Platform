-- Up Migration

-- DB-level backstop for the 1-5 rating range Zod already enforces at the API
-- layer — belt-and-suspenders in case anything ever writes directly.
DO $$ BEGIN
  ALTER TABLE tickets ADD CONSTRAINT chk_customer_feedback_rating
    CHECK (customer_feedback_rating IS NULL OR customer_feedback_rating BETWEEN 1 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at wasn't tracked on these tables — bring them in line with
-- tickets/ticket_inventory, which already have it via set_updated_at().
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE remarks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS trg_remarks_updated_at ON remarks;
CREATE TRIGGER trg_remarks_updated_at
BEFORE UPDATE ON remarks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Down Migration

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
ALTER TABLE users DROP COLUMN IF EXISTS updated_at;

DROP TRIGGER IF EXISTS trg_remarks_updated_at ON remarks;
ALTER TABLE remarks DROP COLUMN IF EXISTS updated_at;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
ALTER TABLE customers DROP COLUMN IF EXISTS updated_at;

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_customer_feedback_rating;
