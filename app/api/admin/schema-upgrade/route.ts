import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../lib/admin-session';
import { getDb } from '../../../../lib/db';

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  try {
    const sql = getDb();
    await sql`ALTER TABLE licenses ADD COLUMN IF NOT EXISTS license_code_encrypted TEXT`;
    return NextResponse.json({ ok: true, upgraded: true });
  } catch (error) {
    console.error('Schema upgrade failed', error);
    return NextResponse.json({ ok: false, error: 'schema_upgrade_failed' }, { status: 500 });
  }
}
