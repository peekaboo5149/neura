import { HealthService } from '@api/health/health.service';
import 'reflect-metadata';

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    healthService = new HealthService();
  });

  describe('checkHealth', () => {
    it('should return OK for basic health check', () => {
      const result = healthService.checkHealth();

      expect(result).toBe('OK');
    });
  });

  describe('getDetailedHealth', () => {
    it('should return detailed health status', () => {
      const result = healthService.getDetailedHealth();

      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('uptime');
    });

    it('should return valid ISO timestamp', () => {
      const result = healthService.getDetailedHealth();
      const timestamp = result.timestamp as string;

      expect(() => new Date(timestamp)).not.toThrow();
    });

    it('should return positive uptime', () => {
      const result = healthService.getDetailedHealth();
      const uptime = result.uptime as number;

      expect(uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
