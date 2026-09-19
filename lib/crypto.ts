import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

export function normalizeLicenseCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function generateLicenseCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(16);
  let body = '';
  for (let i = 0; i < 16; i += 1) body += alphabet[bytes[i] % alphabet.length];
  return `TC-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}-${body.slice(12, 16)}`;
}

function pepper() {
  const value = process.env.LICENSE_PEPPER;
  if (!value) throw new Error('LICENSE_PEPPER is not configured');
  return value;
}

export function hashLicenseCode(code: string) {
  return createHmac('sha256', pepper()).update(normalizeLicenseCode(code)).digest('hex');
}

export function hashInstallationId(installationId: string) {
  return createHmac('sha256', pepper()).update('installation:').update(installationId.trim()).digest('hex');
}

export function getLicensePrefix(code: string) {
  return normalizeLicenseCode(code).slice(0, 6);
}

function encryptionKey() {
  return createHash('sha256').update('license-code-encryption:').update(pepper()).digest();
}

export function encryptLicenseCode(code: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(x => x.toString('base64url')).join('.');
}

export function decryptLicenseCode(value: string) {
  const [ivText, tagText, encryptedText] = value.split('.');
  if (!ivText || !tagText || !encryptedText) throw new Error('Invalid encrypted license code');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]).toString('utf8');
}
