/**
 * TraceContext - Immutable context for distributed tracing
 * Compatible with OpenTelemetry and other tracing systems
 */
export interface TraceContext {
  /**
   * Unique identifier for the entire trace/request flow
   */
  readonly traceId: string;

  /**
   * Unique identifier for the current span/operation
   */
  readonly spanId: string;

  /**
   * Optional correlation ID for tracking related operations across services
   */
  readonly correlationId?: string;

  /**
   * Optional user identifier for user-centric tracing
   */
  readonly userId?: string;

  /**
   * Optional parent span ID for hierarchical tracing
   */
  readonly parentSpanId?: string;

  /**
   * Whether this span is sampled for tracing
   */
  readonly sampled?: boolean;
}

/**
 * Generate a random trace ID (16 bytes hex string)
 */
export function generateTraceId(): string {
  return generateHexString(16);
}

/**
 * Generate a random span ID (8 bytes hex string)
 */
export function generateSpanId(): string {
  return generateHexString(8);
}

/**
 * Generate a correlation ID
 */
export function generateCorrelationId(): string {
  return generateHexString(8);
}

/**
 * Generate a hex string of specified byte length
 */
function generateHexString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);

  // Use crypto if available (Node.js)
  // eslint-disable-next-line no-undef
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // eslint-disable-next-line no-undef
    crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create a new root trace context
 */
export function createTraceContext(overrides?: Partial<TraceContext>): TraceContext {
  return {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    correlationId: generateCorrelationId(),
    sampled: true,
    ...overrides,
  };
}

/**
 * Create a child trace context from a parent
 */
export function createChildTraceContext(
  parent: TraceContext,
  overrides?: Partial<Omit<TraceContext, 'traceId' | 'parentSpanId'>>
): TraceContext {
  return {
    ...parent,
    parentSpanId: parent.spanId,
    spanId: generateSpanId(),
    ...overrides,
  };
}

/**
 * Check if a trace context is valid
 */
export function isValidTraceContext(context: unknown): context is TraceContext {
  if (!context || typeof context !== 'object') {
    return false;
  }

  const ctx = context as Record<string, unknown>;

  return (
    typeof ctx.traceId === 'string' &&
    ctx.traceId.length === 32 &&
    typeof ctx.spanId === 'string' &&
    ctx.spanId.length === 16
  );
}
