/**
 * LogMetadata - Structured metadata that can be attached to log entries
 * Supports primitive types and nested objects for structured logging
 */
export interface LogMetadata {
  readonly [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | Date
    | Error
    | LogMetadata
    | readonly (string | number | boolean | null | LogMetadata)[];
}

/**
 * Serializable metadata for JSON output
 * Error objects are converted to plain objects
 */
export interface SerializableLogMetadata {
  readonly [key: string]: unknown;
}

/**
 * Redaction configuration for sensitive fields
 */
export interface RedactionConfig {
  readonly fields: readonly string[];
  readonly mask?: string;
}

/**
 * Default sensitive fields that should be redacted
 */
export const DEFAULT_SENSITIVE_FIELDS: readonly string[] = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'auth',
  'credential',
  'credentials',
  'privateKey',
  'private_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'sessionId',
  'session_id',
];

/**
 * Redact sensitive fields from metadata
 */
export function redactMetadata(
  metadata: LogMetadata | undefined,
  config: RedactionConfig
): SerializableLogMetadata | undefined {
  if (!metadata) {
    return undefined;
  }

  const mask = config.mask ?? '[REDACTED]';
  const fieldsToRedact = new Set(config.fields.map((f) => f.toLowerCase()));

  function redactValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map(redactValue);
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        if (fieldsToRedact.has(key.toLowerCase())) {
          result[key] = mask;
        } else {
          result[key] = redactValue(val);
        }
      }
      return result;
    }

    return value;
  }

  return redactValue(metadata) as SerializableLogMetadata;
}
