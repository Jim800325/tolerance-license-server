import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-session';
import { getDb } from '../../../../../lib/db';

const statuses = new Set(['active', 'paused', 'revoked']);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  try {
    const body = await request.json();
    const sql = getDb();
    if (body?.action === 'reset_devices') {
      await sql`UPDATE license_devices SET revoked_at = NOW() WHERE license_id = ${id} AND revoked_at IS NULL`;
      await sql`INSERT INTO admin_audit_log (action, license_id) VALUES ('devices_reset', ${id})`;
      return NextResponse.json({ ok: true });
    }
    const current = await sql`SELECT status, expires_at, max_devices, customer_note FROM licenses WHERE id = ${id}`;
    if (!current.length) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    const status = body?.status ?? current[0].status;
    if (!statuses.has(status)) return NextResponse.json({ ok: false, error: 'invalid_status' }, { status: 400 });
    const maxDevices = body?.maxDevices === undefined ? Number(current[0].max_devices) : Number(body.maxDevices);
    if (!Number.isInteger(maxDevices) || maxDevices < 1 || maxDevices > 100)
      return NextResponse.json({ ok: false, error: 'invalid_max_devices' }, { status: 400 });
    let expiresAt: string | null = current[0].expires_at ? new Date(current[0].expires_at).toISOString() : null;
    if (body?.expiresAt !== undefined) {
      if (body.expiresAt === null || body.expiresAt === '') expiresAt = null;
      else {
        const parsed = new Date(body.expiresAt);
        if (Number.isNaN(parsed.getTime())) return NextResponse.json({ ok: false, error: 'invalid_expiry' }, { status: 400 });
        expiresAt = parsed.toISOString();
      }
    }
    const note = body?.customerNote === undefined ? current[0].customer_note : String(body.customerNote).slice(0, 500) || null;
    const updated = await sql`UPDATE licenses SET status=${status}, expires_at=${expiresAt}, max_devices=${maxDevices},
      customer_note=${note}, updated_at=NOW() WHERE id=${id}
      RETURNING id, license_prefix, customer_note, status, expires_at, max_devices, updated_at`;
    await sql`INSERT INTO admin_audit_log (action, license_id, details)
      VALUES ('license_updated', ${id}, ${JSON.stringify({ status, expiresAt, maxDevices })}::jsonb)`;
    return NextResponse.json({ ok: true, license: updated[0] });
  } catch (error) {
    console.error('Update license failed', error);
    return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  try {
    const sql = getDb();
    const found = await sql`SELECT id, license_prefix FROM licenses WHERE id=${id}`;
    if (!found.length) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    await sql`DELETE FROM licenses WHERE id=${id}`;
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    console.error('Delete license failed', error);
    return NextResponse.json({ ok: false, error: 'delete_failed' }, { status: 500 });
  }
}
