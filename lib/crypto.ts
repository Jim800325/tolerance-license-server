import { createHmac, randomBytes } from 'node:crypto';

export function normalizeLicenseCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function generateLicenseCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(16);
  let body = '';

  for (let i = 0; i < 16; i += 1) {
    body += alphabet[bytes[i] % alphabet.length];
  }

  return `TC-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}-${body.slice(12, 16)}`;
}

export function hashLicenseCode(code: string) {
  const pepper = process.env.LICENSE_PEPPER;
  if (!pepper) throw new Error('LICENSE_PEPPER is not configured');

  return createHmac('sha256', pepper)
    .update(normalizeLicenseCode(code))
    .digest('hex');
}

export function getLicensePrefix(code: string) {
  const normalized = normalizeLicenseCode(code);
  return normalized.slice(0, 6);
}
