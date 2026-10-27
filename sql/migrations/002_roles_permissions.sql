-- Module 5B: Roles & Permissions (RBAC)

CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT roles_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT permissions_key_unique UNIQUE (key)
);

-- Many-to-many: role ↔ permission
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- Many-to-many: user ↔ role
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions (role_id);

-- ---------- Seed: permissions ----------
INSERT INTO permissions (key, description) VALUES
  ('content.read',    'View content'),
  ('content.create',  'Create content drafts'),
  ('content.update',  'Edit content'),
  ('content.publish', 'Publish content'),
  ('content.delete',  'Delete content'),
  ('media.upload',    'Upload media files'),
  ('seo.update',      'Edit SEO metadata'),
  ('users.manage',    'Manage users and assign roles'),
  ('roles.manage',    'Manage roles and permissions')
ON CONFLICT (key) DO NOTHING;

-- ---------- Seed: roles ----------
INSERT INTO roles (name, description) VALUES
  ('admin',          'Full system access'),
  ('editor',         'Create, edit, and publish content'),
  ('viewer',         'Read-only access'),
  ('seo_specialist', 'Edit content/SEO metadata, cannot publish or manage users')
ON CONFLICT (name) DO NOTHING;

-- ---------- Seed: role_permissions ----------
-- viewer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'viewer'
  AND p.key IN ('content.read')
ON CONFLICT DO NOTHING;

-- editor
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'editor'
  AND p.key IN (
    'content.read',
    'content.create',
    'content.update',
    'content.publish',
    'media.upload'
  )
ON CONFLICT DO NOTHING;

-- seo_specialist (tere B answer ka polished version)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'seo_specialist'
  AND p.key IN (
    'content.read',
    'content.update',
    'seo.update'
  )
ON CONFLICT DO NOTHING;

-- admin = ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
