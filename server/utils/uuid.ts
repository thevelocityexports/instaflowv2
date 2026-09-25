import crypto from 'crypto';

/**
 * Validates whether a string is a standard RFC-4122 UUID.
 */
export function isValidUuid(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

/**
 * Converts any arbitrary string (e.g. email, legacy 'usr_123', 'acc_456')
 * into a deterministic, RFC-compliant UUID v4 format.
 * If already a valid UUID, returns it unchanged.
 */
export function toValidUuid(input?: string | null): string {
  if (!input || typeof input !== 'string' || !input.trim()) {
    return crypto.randomUUID();
  }
  const clean = input.trim();
  if (isValidUuid(clean)) {
    return clean.toLowerCase();
  }

  // Deterministically hash to standard UUID v4 format
  const hash = crypto.createHash('sha256').update(clean.toLowerCase()).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.substring(18, 20),
    hash.substring(20, 32),
  ].join('-').toLowerCase();
}
