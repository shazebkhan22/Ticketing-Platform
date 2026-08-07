-- Up Migration

-- Who was sent to hand-deliver the product back to the customer once repair
-- is done — only meaningful for outsourced repairs (see upsertInventory's
-- validation, which mirrors the existing outsource_vendor/expected_return_date
-- requirement for that repair location).
ALTER TABLE ticket_inventory ADD COLUMN delivery_person TEXT;

-- Down Migration

ALTER TABLE ticket_inventory DROP COLUMN IF EXISTS delivery_person;
