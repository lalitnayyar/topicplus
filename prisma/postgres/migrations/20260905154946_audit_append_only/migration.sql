-- Enforce append-only semantics for AuditEvent at the database layer (not only the app
-- layer). Section 8: "Make audit events append-only during their defined retention
-- period. Enforce this through server and database controls, not only the UI."
-- Postgres equivalent of the SQLite trigger in ../../../migrations/20260905144124_audit_append_only.

CREATE OR REPLACE FUNCTION audit_event_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent rows are append-only and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_event_no_update
BEFORE UPDATE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION audit_event_block_mutation();

CREATE TRIGGER audit_event_no_delete
BEFORE DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION audit_event_block_mutation();
