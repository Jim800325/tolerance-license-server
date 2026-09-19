import { NextRequest, NextResponse } from 'next/server';
import { hashInstallationId } from '../../../../lib/crypto';
import { getDb } from '../../../../lib/db';
import { getLicenseAvailability, LicenseStatus } from '../../../../lib/license';
import { createLicenseToken, verifyLicenseToken } from '../../../../lib/license-token';

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
    const token = typeof body?.token === 'string' ? body.token : '';
    const installationId = typeof body?.installationId === 'string' ? body.installationId.trim() : '';
    if (!token || installationId.length < 12 || installationId.length > 200)
      return json({ ok: false, error: 'invalid_request' }, 400);

    const payload = verifyLicenseToken(token);
    if (!payload) return json({ ok: false, error: 'invalid_or_expired_token' }, 401);

    const installationHash = hashInstallationId(installationId);
    if (installationHash !== payload.installationHash)
      return json({ ok: false, error: 'device_mismatch' }, 403);

    const sql = getDb();
    const rows = await sql`
      SELECT l.status, l.expires_at, l.max_devices, l.features, d.id AS device_id
      FROM licenses l
      JOIN license_devices d ON d.license_id=l.id
      WHERE l.id=${payload.licenseId} AND d.installation_hash=${installationHash}
        AND d.revoked_at IS NULL LIMIT 1
    `;
    if (!rows.length) return json({ ok: false, error: 'license_or_device_revoked' }, 403);

    const row = rows[0];
    const availability = getLicenseAvailability(row.status as LicenseStatus, row.expires_at as string | null);
    if (!availability.valid) return json({ ok: false, error: availability.reason }, 403);

    await sql`UPDATE license_devices SET last_seen_at=NOW() WHERE id=${row.device_id}`;
    const refreshedToken = createLicenseToken(payload.licenseId, installationHash);
    return json({
      ok: true,
      token: refreshedToken,
      tokenExpiresIn: 900,
      license: {
        expiresAt: row.expires_at ?? null,
        maxDevices: Number(row.max_devices),
        features: row.features ?? {},
      },
    });
  } catch (error) {
    console.error('License verification failed', error);
    return json({ ok: false, error: 'verification_failed' }, 500);
  }
}
