import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function authorized(request: NextRequest) {
  const expected = process.env.DB_INIT_SECRET;
  const supplied = request.headers.get('x-db-init-secret');

  if (!expected || !supplied) return false;

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const sql = getDb();

    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

    await sql`
      CREATE TABLE IF NOT EXISTS licenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        license_hash TEXT UNIQUE NOT NULL,
        license_prefix TEXT NOT NULL,
        customer_note TEXT,
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'paused', 'revoked')),
        expires_at TIMESTAMPTZ,
        max_devices INTEGER NOT NULL DEFAULT 1 CHECK (max_devices >= 1),
        features JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS license_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
        installation_hash TEXT NOT NULL,
        label TEXT,
        first_activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ,
        UNIQUE (license_id, installation_hash)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS admin_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action TEXT NOT NULL,
        license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_licenses_expires_at ON licenses(expires_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_license_devices_license_id ON license_devices(license_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_license_id ON admin_audit_log(license_id)`;

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('licenses', 'license_devices', 'admin_audit_log')
      ORDER BY table_name
    `;

    return NextResponse.json({
      ok: true,
      initialized: true,
      tables: tables.map((row) => row.table_name),
    });
  } catch (error) {
    console.error('Database initialization failed', error);
    return NextResponse.json(
      { ok: false, error: 'database_initialization_failed' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'method_not_allowed' },
    { status: 405, headers: { Allow: 'POST' } },
  );
}
