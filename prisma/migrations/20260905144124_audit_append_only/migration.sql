-- Enforce append-only semantics for AuditEvent at the database layer (not only the app layer).
-- Section 8 of topicpulse-application-prompt.md: "Make audit events append-only during their
-- defined retention period. Enforce this through server and database controls, not only the UI."
CREATE TRIGGER audit_event_no_update
BEFORE UPDATE ON "AuditEvent"
BEGIN
  SELECT RAISE(ABORT, 'AuditEvent rows are append-only and cannot be updated');
END;

CREATE TRIGGER audit_event_no_delete
BEFORE DELETE ON "AuditEvent"
BEGIN
  SELECT RAISE(ABORT, 'AuditEvent rows are append-only and cannot be deleted');
END;
