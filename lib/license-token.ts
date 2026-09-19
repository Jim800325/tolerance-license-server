import { createHmac, timingSafeEqual } from 'node:crypto';

export type LicenseTokenPayload = {
  v: 1;
  licenseId: string;
  installationHash: string;
  exp: number;
};

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error('SESSION_SECRET is not configured');
  return value;
}

function sign(encoded: string) {
  return createHmac('sha256', secret()).update('license-token:').update(encoded).digest('base64url');
}

export const LICENSE_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export function createLicenseToken(licenseId: string, installationHash: string, ttlSeconds = LICENSE_TOKEN_TTL_SECONDS) {
  const payload: LicenseTokenPayload = {
    v: 1,
    licenseId,
    installationHash,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifyLicenseToken(token: string): LicenseTokenPayload | null {
  try {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return null;
    const expected = sign(encoded);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as LicenseTokenPayload;
    if (payload.v !== 1 || !payload.licenseId || !payload.installationHash || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
