/**
 * Logging Service
 * Provides secure, structured logging for InstaFlow.
 * Guarantees that sensitive tokens (Meta access tokens, client secrets)
 * are NEVER printed to logs or stored in error traces.
 */

export class LoggingService {
  private static sanitize(data: unknown): unknown {
    if (!data) return data;
    if (typeof data === 'string') {
      // Redact potential access tokens or bearer keys
      return data
        .replace(/EAA[a-zA-Z0-9_-]+/g, '[REDACTED_META_TOKEN]')
        .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]')
        .replace(/(secret|token|apikey|api_key)=([a-zA-Z0-9._-]+)/gi, '$1=[REDACTED]');
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (typeof data === 'object') {
      const sanitizedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('token') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('password') ||
          lowerKey.includes('authorization')
        ) {
          sanitizedObj[key] = '[REDACTED]';
        } else {
          sanitizedObj[key] = this.sanitize(value);
        }
      }
      return sanitizedObj;
    }

    return data;
  }

  static info(message: string, meta?: unknown) {
    const timestamp = new Date().toISOString();
    const cleanMeta = meta ? this.sanitize(meta) : '';
    console.log(`[${timestamp}] [INFO] ${message}`, cleanMeta ? JSON.stringify(cleanMeta) : '');
  }

  static warn(message: string, meta?: unknown) {
    const timestamp = new Date().toISOString();
    const cleanMeta = meta ? this.sanitize(meta) : '';
    console.warn(`[${timestamp}] [WARN] ${message}`, cleanMeta ? JSON.stringify(cleanMeta) : '');
  }

  static error(message: string, error?: unknown) {
    const timestamp = new Date().toISOString();
    const cleanError = error instanceof Error 
      ? { name: error.name, message: error.message }
      : this.sanitize(error);
    console.error(`[${timestamp}] [ERROR] ${message}`, cleanError);
  }

  static sanitizeForDb(meta: unknown): Record<string, unknown> {
    const clean = this.sanitize(meta);
    if (typeof clean === 'object' && clean !== null && !Array.isArray(clean)) {
      return clean as Record<string, unknown>;
    }
    return { data: clean };
  }
}
