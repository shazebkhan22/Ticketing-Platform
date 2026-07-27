-- Up Migration

-- Documents a design decision that was previously only implicit in
-- application code (utils/customers.ts's getOrCreateCustomerId): tickets.*
-- contact fields are an intentional point-in-time snapshot, not a live
-- reference to customers. See the matching comment in db/schema.sql for the
-- full explanation — this just makes it visible from psql/pgAdmin directly,
-- not only to someone reading the source.
COMMENT ON COLUMN tickets.company_name IS
  'Snapshot of the company name as of when this ticket was raised. Not kept in sync with customers.name after the fact — see customer_id for the current/canonical record.';
COMMENT ON COLUMN tickets.contact_name IS
  'Snapshot of the contact person as of when this ticket was raised. Not kept in sync with customers.contact_name after the fact.';
COMMENT ON COLUMN tickets.contact_no IS
  'Snapshot of the contact phone number as of when this ticket was raised. Not kept in sync with customers.contact_no after the fact.';
COMMENT ON COLUMN tickets.email_id IS
  'Snapshot of the contact email as of when this ticket was raised. Not kept in sync with customers.email_id after the fact.';
COMMENT ON COLUMN tickets.address IS
  'Snapshot of the address as of when this ticket was raised. Not kept in sync with customers.address after the fact.';
COMMENT ON COLUMN tickets.customer_id IS
  'Points to the canonical, latest-known customer record. See getOrCreateCustomerId (utils/customers.ts) for how it stays current — the columns above intentionally do not.';

-- Down Migration

COMMENT ON COLUMN tickets.company_name IS NULL;
COMMENT ON COLUMN tickets.contact_name IS NULL;
COMMENT ON COLUMN tickets.contact_no IS NULL;
COMMENT ON COLUMN tickets.email_id IS NULL;
COMMENT ON COLUMN tickets.address IS NULL;
COMMENT ON COLUMN tickets.customer_id IS NULL;
