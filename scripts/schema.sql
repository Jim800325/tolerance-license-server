CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_hash TEXT UNIQUE NOT NULL,
  license_prefix TEXT NOT NULL,
  license_code_encrypted TEXT,
  customer_note TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'revoked')),
  expires_at TIMESTAMPTZ,
  max_devices INTEGER NOT NULL DEFAULT 1 CHECK (max_devices >= 1),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license_code_encrypted TEXT;

CREATE TABLE IF NOT EXISTS license_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  installation_hash TEXT NOT NULL,
  label TEXT,
  first_activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (license_id, installation_hash)
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at ON licenses(expires_at);
CREATE INDEX IF NOT EXISTS idx_license_devices_license_id ON license_devices(license_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_license_id ON admin_audit_log(license_id);
