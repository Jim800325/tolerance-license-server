import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`SELECT NOW() AS server_time`;

    return NextResponse.json({
      ok: true,
      service: 'tolerance-license-server',
      database: 'connected',
      serverTime: rows[0]?.server_time ?? null,
    });
  } catch (error) {
    console.error('Database health check failed', error);
    return NextResponse.json(
      {
        ok: false,
        service: 'tolerance-license-server',
        database: 'unavailable',
      },
      { status: 503 },
    );
  }
}
