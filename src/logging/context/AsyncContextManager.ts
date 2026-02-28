import { AsyncLocalStorage } from 'async_hooks';
import type { TraceContext } from './TraceContext';

/**
 * AsyncContextManager - Manages trace context across async operations
 * Uses Node.js AsyncLocalStorage for context propagation
 * 
 * This enables automatic trace context attachment to logs without
 * explicitly passing context through every function call
 */
export class AsyncContextManager {
  private static instance: AsyncContextManager;
  private readonly storage: AsyncLocalStorage<TraceContext>;

  private constructor() {
    this.storage = new AsyncLocalStorage<TraceContext>();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): AsyncContextManager {
    if (!AsyncContextManager.instance) {
      AsyncContextManager.instance = new AsyncContextManager();
    }
    return AsyncContextManager.instance;
  }

  /**
   * Run a function within a trace context
   * @param context - The trace context to use
   * @param fn - The function to run
   * @returns The result of the function
   */
  public runWithContext<T>(context: TraceContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  /**
   * Run an async function within a trace context
   * @param context - The trace context to use
   * @param fn - The async function to run
   * @returns A promise that resolves to the result
   */
  public async runWithContextAsync<T>(
    context: TraceContext,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.storage.run(context, fn);
  }

  /**
   * Get the current trace context
   * Returns undefined if no context is active
   */
  public getContext(): TraceContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Check if a trace context is currently active
   */
  public hasContext(): boolean {
    return this.storage.getStore() !== undefined;
  }

  /**
   * Create a middleware function for Express/Connect
   * Automatically creates and manages trace context for each request
   */
  public createMiddleware(): (
    req: Record<string, unknown>,
    res: Record<string, unknown>,
    next: () => void
  ) => void {
    return (req, _res, next) => {
      const traceContext = this.extractContextFromRequest(req);
      this.runWithContext(traceContext, next);
    };
  }

  /**
   * Extract or create trace context from an incoming request
   */
  private extractContextFromRequest(
    req: Record<string, unknown>
  ): TraceContext {
    const headers = (req.headers as Record<string, string | string[] | undefined>) || {};

    const traceId = this.getHeaderValue(headers, 'x-trace-id') ||
      this.getHeaderValue(headers, 'x-request-id') ||
      this.generateId(16);

    const spanId = this.generateId(8);

    const correlationId =
      this.getHeaderValue(headers, 'x-correlation-id') ||
      this.generateId(8);

    const parentSpanId = this.getHeaderValue(headers, 'x-span-id') ||
      this.getHeaderValue(headers, 'x-parent-span-id');

    const sampled = this.parseSampledHeader(
      this.getHeaderValue(headers, 'x-sampled')
    );

    return {
      traceId,
      spanId,
      correlationId,
      parentSpanId,
      sampled,
    };
  }

  /**
   * Get a header value, handling array values
   */
  private getHeaderValue(
    headers: Record<string, string | string[] | undefined>,
    name: string
  ): string | undefined {
    const value = headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  /**
   * Parse the sampled header
   */
  private parseSampledHeader(value: string | undefined): boolean | undefined {
    if (value === undefined) {
      return undefined;
    }
    return value === '1' || value.toLowerCase() === 'true';
  }

  /**
   * Generate a random hex ID
   */
  private generateId(byteLength: number): string {
    const bytes = new Uint8Array(byteLength);
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

/**
 * Convenience function to get the current trace context
 */
export function getCurrentTraceContext(): TraceContext | undefined {
  return AsyncContextManager.getInstance().getContext();
}

/**
 * Convenience function to run code within a trace context
 */
export function runWithTraceContext<T>(
  context: TraceContext,
  fn: () => T
): T {
  return AsyncContextManager.getInstance().runWithContext(context, fn);
}

/**
 * Convenience function to run async code within a trace context
 */
export function runWithTraceContextAsync<T>(
  context: TraceContext,
  fn: () => Promise<T>
): Promise<T> {
  return AsyncContextManager.getInstance().runWithContextAsync(context, fn);
}
