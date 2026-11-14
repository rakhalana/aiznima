const SENSITIVE_KEY_PATTERN = /(access_token|token|authorization|bearer)/i;

function redact(meta?: unknown): unknown {
  if (!meta || typeof meta !== 'object') {
    return meta;
  }

  if (Array.isArray(meta)) {
    return meta.map((item) => redact(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[REDACTED]' : value;
  }
  return sanitized;
}

export const logger = {
  debug(message: string, meta?: unknown): void {
    if (import.meta.env.DEV) {
      console.debug(`[Aiznima] ${message}`, meta !== undefined ? redact(meta) : '');
    }
  },
  warn(message: string, meta?: unknown): void {
    if (import.meta.env.DEV) {
      console.warn(`[Aiznima] ${message}`, meta !== undefined ? redact(meta) : '');
    }
  },
  error(message: string, meta?: unknown): void {
    console.error(`[Aiznima] ${message}`, meta !== undefined ? redact(meta) : '');
  },
};
