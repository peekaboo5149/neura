import 'reflect-metadata';
import { injectable } from 'tsyringe';

/**
 * HealthService - Business logic for health checks
 * 
 * This service encapsulates all health-related business logic.
 * Currently minimal but designed for extensibility (DB checks, external services, etc.)
 */
@injectable()
export class HealthService {
  /**
   * Perform a basic health check
   * @returns 'OK' if the service is healthy
   */
  public checkHealth(): string {
    // Future: Add database connectivity checks
    // Future: Add external service health checks
    // Future: Add memory/CPU usage checks
    return 'OK';
  }

  /**
   * Perform a detailed health check
   * @returns Detailed health status object
   */
  public getDetailedHealth(): Record<string, unknown> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      uptime: process.uptime(),
    };
  }
}
