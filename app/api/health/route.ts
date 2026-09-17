import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'tolerance-license-server',
    version: '7.0.0',
    phase: 1,
    database: 'not-connected',
    calculator: 'v6.1.7-unchanged',
    timestamp: new Date().toISOString(),
  });
}
