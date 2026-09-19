import { NextRequest, NextResponse } from 'next/server';
import { adminCookie, createAdminToken, passwordMatches } from '../../../../lib/admin-session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body?.password !== 'string' || !passwordMatches(body.password)) {
      return NextResponse.json({ ok: false, error: 'invalid_credentials' }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(adminCookie.name, createAdminToken(), adminCookie.options);
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: 'login_failed' }, { status: 400 });
  }
}
