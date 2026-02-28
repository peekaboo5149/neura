import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env file BEFORE any other imports
// This must happen before ExecutionModeDetector or any config classes are loaded
dotenvConfig();

import { ExecutionModeDetector, NeuraHomeService, PidService, ProcessService } from '@daemon';

// Apply execution mode BEFORE any other imports that might depend on NODE_ENV
ExecutionModeDetector.apply();

import { createServer, setupGracefulShutdown, startServer } from '@bootstrap/server';
import { handleCliCommand } from '@cli/bootstrap';
import { Logger } from '@logging';
import 'reflect-metadata';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const server = await createServer();

  // If running as daemon, set up PID file cleanup on shutdown
  if (ProcessService.isDaemonProcess()) {
    const homeService = new NeuraHomeService();
    const pidService = new PidService(homeService);
    setupGracefulShutdown(server, pidService);
  } else {
    setupGracefulShutdown(server);
  }

  await startServer(server);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle CLI commands first
  const commandHandled = await handleCliCommand(args);
  if (commandHandled) {
    return;
  }

  // If we're a daemon process, ensure home directory and PID file
  if (ProcessService.isDaemonProcess()) {
    const homeService = new NeuraHomeService();
    await homeService.ensureHomeDirectory();

    const pidService = new PidService(homeService);
    await pidService.writePid();

    logger.info('Daemon process started', { pid: process.pid });
  }

  // Normal server startup
  await bootstrap();
}

main().catch((error: Error) => {
  logger.error('Bootstrap failed', error);
  process.exit(1);
});
