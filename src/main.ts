import { createServer, setupGracefulShutdown, startServer } from '@bootstrap/server';
import { handleCliCommand } from '@cli/bootstrap';
import { Logger } from '@logging';
import 'reflect-metadata';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const server = await createServer();
  setupGracefulShutdown(server);
  await startServer(server);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle CLI commands first
  const commandHandled = await handleCliCommand(args);
  if (commandHandled) {
    return;
  }

  // Normal server startup
  await bootstrap();
}

main().catch((error: Error) => {
  logger.error('Bootstrap failed', error);
  process.exit(1);
});
