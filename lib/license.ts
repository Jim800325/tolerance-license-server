export type LicenseStatus = 'active' | 'paused' | 'revoked';

export function isExpired(expiresAt: Date | string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

export function getLicenseAvailability(status: LicenseStatus, expiresAt: Date | string | null) {
  if (status === 'revoked') return { valid: false, reason: 'revoked' as const };
  if (status === 'paused') return { valid: false, reason: 'paused' as const };
  if (isExpired(expiresAt)) return { valid: false, reason: 'expired' as const };
  return { valid: true, reason: 'active' as const };
}
