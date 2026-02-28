import { FastifyInstance } from 'fastify';

/**
 * Base interface for all controllers in the Neura application.
 *
 * Controllers implementing this interface are responsible for registering
 * their routes with the Fastify instance. This provides a consistent
 * pattern for route registration across the application.
 *
 * @example
 * ```typescript
 * export class HealthController implements BaseController {
 *   registerRoutes(fastify: FastifyInstance): void {
 *     fastify.get('/health', async () => ({ status: 'ok' }));
 *   }
 * }
 * ```
 */
export interface BaseController {
  /**
   * Register all routes for this controller with the Fastify instance.
   *
   * @param fastify - The Fastify server instance to register routes with
   */
  registerRoutes(fastify: FastifyInstance): void;
}
