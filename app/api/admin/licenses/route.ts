import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '../../../../lib/admin-session';
import { generateLicenseCode, getLicensePrefix, hashLicenseCode } from '../../../../lib/crypto';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const sql = getDb();
  const rows = await sql`
    SELECT l.id, l.license_prefix, l.customer_note, l.status, l.expires_at, l.max_devices,
           l.features, l.created_at, l.updated_at,
           COUNT(d.id) FILTER (WHERE d.revoked_at IS NULL)::int AS active_devices
    FROM licenses l
    LEFT JOIN license_devices d ON d.license_id = l.id
    GROUP BY l.id ORDER BY l.created_at DESC
  `;
  return NextResponse.json({ ok: true, licenses: rows });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const maxDevices = Number(body?.maxDevices ?? 1);
    if (!Number.isInteger(maxDevices) || maxDevices < 1 || maxDevices > 100) {
      return NextResponse.json({ ok: false, error: 'invalid_max_devices' }, { status: 400 });
    }
    const expiresAt = body?.expiresAt ? new Date(body.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ ok: false, error: 'invalid_expiry' }, { status: 400 });
    }
    const code = generateLicenseCode();
    const sql = getDb();
    const inserted = await sql`
      INSERT INTO licenses (license_hash, license_prefix, customer_note, expires_at, max_devices)
      VALUES (${hashLicenseCode(code)}, ${getLicensePrefix(code)}, ${String(body?.customerNote ?? '').slice(0, 500) || null},
              ${expiresAt ? expiresAt.toISOString() : null}, ${maxDevices})
      RETURNING id, license_prefix, customer_note, status, expires_at, max_devices, created_at
    `;
    await sql`INSERT INTO admin_audit_log (action, license_id, details)
              VALUES ('license_created', ${inserted[0].id}, ${JSON.stringify({ maxDevices, expiresAt: expiresAt?.toISOString() ?? null })}::jsonb)`;
    return NextResponse.json({ ok: true, licenseCode: code, license: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('Create license failed', error);
    return NextResponse.json({ ok: false, error: 'create_failed' }, { status: 500 });
  }
}
