import { getConfigRegistry, initializeConfigs } from '@config';
import { initializeContainer } from '@config/container';
import { ServerConfig } from '@config/server.config';
import cors from '@fastify/cors';
import csrfProtection from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';
import { Logger } from '@logging';
import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import 'reflect-metadata';
import { registerRoutes } from './registerRoutes';

/**
 * Server configuration and bootstrap
 * 
 * Encapsulates all Fastify server setup:
 * - Plugin registration (security, CORS)
 * - Route registration
 * - Error handling
 * - Graceful shutdown
 */

/**
 * Create and configure Fastify instance
 */
export async function createServer(): Promise<FastifyInstance> {
  // Initialize configurations first (fail-fast validation)
  initializeConfigs();

  const logger = new Logger('Server');

  // Initialize DI container
  initializeContainer();

  // Create Fastify instance with custom logger
  const fastify = Fastify({
    logger: false, // We use our custom logger
    pluginTimeout: 10000,
  });

  // Register security plugins
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  const serverConfig = getConfigRegistry().get<ServerConfig>('server') as ServerConfig | undefined;
  if (!serverConfig) {
    throw new Error('Server configuration not found');
  }

  await fastify.register(cors, {
    origin: serverConfig.corsOrigin,
    credentials: true,
  });

  await fastify.register(csrfProtection, {
    cookieOpts: { signed: false },
  });

  // Register custom logger for request/response logging
  fastify.addHook('onRequest', async (request) => {
    request.log = logger as unknown as FastifyBaseLogger;
  });

  // Register routes
  registerRoutes(fastify);

  // Global error handler
  fastify.setErrorHandler((error: Error, request, reply) => {
    logger.error('Request error', error, {
      method: request.method,
      url: request.url,
      requestId: request.id,
    });

    const serverConfig = getConfigRegistry().get<ServerConfig>('server') as ServerConfig | undefined;
    const isProduction = serverConfig?.isProduction ?? false;

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: isProduction
        ? 'Something went wrong' 
        : error.message,
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    logger.warn('Route not found', {
      method: request.method,
      url: request.url,
    });

    return reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  return fastify;
}

/**
 * Start the server
 */
export async function startServer(fastify: FastifyInstance): Promise<void> {
  const logger = new Logger('Server');
  const serverConfig = getConfigRegistry().get<ServerConfig>('server') as ServerConfig | undefined;
  if (!serverConfig) {
    throw new Error('Server configuration not found');
  }

  const port = serverConfig.port;
  const host = serverConfig.host;

  try {
    await fastify.listen({ port, host });
    logger.info(`Server listening on ${host}:${port}`);
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    throw error;
  }
}

/**
 * Setup graceful shutdown handlers
 */
export function setupGracefulShutdown(fastify: FastifyInstance): void {
  const logger = new Logger('Server');
  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    logger.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      await fastify.close();
      logger.info('Server closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error as Error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    void shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason as Error);
    void shutdown('unhandledRejection');
  });
}
