import { HealthService } from '@api/health/health.service';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';

/**
 * HealthController - HTTP request handler for health endpoints
 *
 * Follows the controller pattern:
 * - Handles HTTP-specific concerns (request/response)
 * - Delegates business logic to HealthService
 * - No business logic in controller methods
 */
@injectable()
export class HealthController {
  constructor(@inject(HealthService) private readonly healthService: HealthService) {}

  /**
   * Register all health routes with Fastify
   * @param fastify - Fastify instance
   */
  public registerRoutes(fastify: FastifyInstance): void {
    fastify.get('/health', this.getHealth.bind(this));
    fastify.get('/health/detailed', this.getDetailedHealth.bind(this));
  }

  /**
   * GET /health
   * Basic health check endpoint
   */
  private async getHealth(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = this.healthService.checkHealth();
    return reply.send(result);
  }

  /**
   * GET /health/detailed
   * Detailed health check endpoint
   */
  private async getDetailedHealth(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = this.healthService.getDetailedHealth();
    return reply.send(result);
  }
}
