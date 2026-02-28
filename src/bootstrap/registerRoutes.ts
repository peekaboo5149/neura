import { HealthController } from '@api/health/health.controller';
import { QueryController } from '@api/query/query.controller';
import { resolve } from '@config/container';
import type { FastifyInstance } from 'fastify';

/**
 * Register all API routes with Fastify
 *
 * This function centralizes route registration.
 * Each controller is resolved from the DI container and registers its own routes.
 *
 * @param fastify - Fastify instance
 */
export function registerRoutes(fastify: FastifyInstance): void {
  // Resolve controllers from DI container
  const healthController = resolve(HealthController);
  const commanderController = resolve(QueryController);

  // Register routes for each controller
  healthController.registerRoutes(fastify);
  commanderController.registerRoutes(fastify);
}
