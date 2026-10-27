-- Module 9: Activity logs (audit trail)
-- Append-only: rows are inserted, never edited or deleted.

CREATE TABLE IF NOT EXISTS activity_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- SET NULL (not CASCADE): deleting a user must not erase their history.
  actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Snapshot so the row still says who did it after the user is gone.
  actor_email  VARCHAR(255) NOT NULL,

  action       VARCHAR(50)  NOT NULL,
  entity_type  VARCHAR(30)  NOT NULL,
  -- No foreign key on purpose: we keep logs for entities that were deleted.
  entity_id    UUID,
  entity_label VARCHAR(255),

  -- Action-specific details, e.g. { "title": { "from": "...", "to": "..." } }
  changes      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
  ON activity_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_id
  ON activity_logs (actor_id);

-- ---------- Append-only guard ----------
-- Blocks UPDATE and DELETE even from raw SQL.
-- One exception: the FK's ON DELETE SET NULL is itself an UPDATE, so clearing
-- actor_id (and nothing else) must be allowed, or deleting a user would fail.
CREATE OR REPLACE FUNCTION activity_logs_block_changes()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.actor_id IS NOT NULL
     AND NEW.actor_id IS NULL
     AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'activity_logs is append-only (% not allowed)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_activity_logs_append_only ON activity_logs;
CREATE TRIGGER trg_activity_logs_append_only
  BEFORE UPDATE OR DELETE ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION activity_logs_block_changes();

-- ---------- Permission: only Admin can read logs ----------
INSERT INTO permissions (key, description) VALUES
  ('activity.read', 'View the activity log (audit trail)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.key = 'activity.read'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE activity_logs IS 'Audit trail: who did what to which entity, and when. Append-only.';
COMMENT ON COLUMN activity_logs.entity_label IS 'Snapshot of the entity name at the time (survives deletion)';
