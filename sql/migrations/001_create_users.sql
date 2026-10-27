-- Module 2: Foundation — users table
-- Why users first? Auth, content authorship, activity logs — sab users pe depend karte hain.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(150) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_email_unique UNIQUE (email)
);

-- Fast login lookups: WHERE email = $1
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Soft-disable users without deleting history
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);

COMMENT ON TABLE users IS 'CMS login identities. Never store plain-text passwords.';
COMMENT ON COLUMN users.password_hash IS 'bcrypt/argon2 hash only — Module 3 mein hashing add hogi';
COMMENT ON COLUMN users.is_active IS 'FALSE = cannot login, but rows/history preserved';
