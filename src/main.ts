import { createServer, setupGracefulShutdown, startServer } from '@bootstrap/server';
import { Logger } from '@logging';
import 'reflect-metadata';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const server = await createServer();
  setupGracefulShutdown(server);
  await startServer(server);
}

bootstrap().catch((error: Error) => {
  logger.error('Bootstrap failed', error);
  process.exit(1);
});
