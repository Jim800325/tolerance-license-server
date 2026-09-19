import { NextRequest, NextResponse } from 'next/server';
import { hashInstallationId, hashLicenseCode, normalizeLicenseCode } from '../../../../lib/crypto';
import { getDb } from '../../../../lib/db';
import { getLicenseAvailability, LicenseStatus } from '../../../../lib/license';
import { createLicenseToken, LICENSE_TOKEN_TTL_SECONDS } from '../../../../lib/license-token';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}


function json(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const licenseCode = typeof body?.licenseCode === 'string' ? body.licenseCode : '';
    const installationId = typeof body?.installationId === 'string' ? body.installationId.trim() : '';
    const deviceLabel = typeof body?.deviceLabel === 'string' ? body.deviceLabel.trim().slice(0, 120) : null;

    if (normalizeLicenseCode(licenseCode).length < 18 || installationId.length < 12 || installationId.length > 200)
      return json({ ok: false, error: 'invalid_request' }, 400);

    const sql = getDb();
    const licenseRows = await sql`
      SELECT id, status, expires_at, max_devices, features
      FROM licenses WHERE license_hash = ${hashLicenseCode(licenseCode)} LIMIT 1
    `;
    if (!licenseRows.length) return json({ ok: false, error: 'invalid_license' }, 401);

    const license = licenseRows[0];
    const availability = getLicenseAvailability(license.status as LicenseStatus, license.expires_at as string | null);
    if (!availability.valid) return json({ ok: false, error: availability.reason }, 403);

    const installationHash = hashInstallationId(installationId);
    const existing = await sql`
      SELECT id, revoked_at FROM license_devices
      WHERE license_id=${license.id} AND installation_hash=${installationHash} LIMIT 1
    `;

    if (existing.length && !existing[0].revoked_at) {
      await sql`UPDATE license_devices SET last_seen_at=NOW(), label=COALESCE(${deviceLabel}, label) WHERE id=${existing[0].id}`;
    } else {
      const countRows = await sql`
        SELECT COUNT(*)::int AS count FROM license_devices
        WHERE license_id=${license.id} AND revoked_at IS NULL
      `;
      if (Number(countRows[0]?.count ?? 0) >= Number(license.max_devices))
        return json({ ok: false, error: 'device_limit_reached', maxDevices: Number(license.max_devices) }, 409);

      if (existing.length) {
        await sql`UPDATE license_devices SET revoked_at=NULL, last_seen_at=NOW(), label=${deviceLabel} WHERE id=${existing[0].id}`;
      } else {
        await sql`INSERT INTO license_devices (license_id, installation_hash, label)
          VALUES (${license.id}, ${installationHash}, ${deviceLabel})`;
      }
    }

    const token = createLicenseToken(String(license.id), installationHash);
    return json({
      ok: true,
      token,
      tokenExpiresIn: LICENSE_TOKEN_TTL_SECONDS,
      license: {
        expiresAt: license.expires_at ?? null,
        maxDevices: Number(license.max_devices),
        features: license.features ?? {},
      },
    });
  } catch (error) {
    console.error('License activation failed', error);
    return json({ ok: false, error: 'activation_failed' }, 500);
  }
}
