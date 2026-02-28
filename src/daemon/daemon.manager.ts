import type { Logger } from '@logging/Logger';
import { NeuraHomeService } from './neura-home.service';
import type { PidService } from './pid.service';
import type { ProcessService } from './process.service';

/**
 * DaemonManager - Orchestrates daemon lifecycle operations
 *
 * Responsibilities:
 * - Start daemon process (with double-start prevention)
 * - Stop daemon process (with graceful shutdown)
 * - Check daemon status
 * - Coordinate PID and Process services
 */
export class DaemonManager {
  constructor(
    private readonly pidService: PidService,
    private readonly processService: ProcessService,
    private readonly logger: Logger
  ) {}

  /**
   * Start the daemon
   * @returns exit code (0 for success, 1 for error)
   */
  public async start(): Promise<number> {
    try {
      // Ensure home directory exists
      const homeService = new NeuraHomeService();
      await homeService.ensureHomeDirectory();

      // Check if already running
      const isRunning = await this.pidService.validateAndCleanup();
      if (isRunning) {
        const pidContent = await this.pidService.readPid();
        this.logger.warn('Neura is already running', { pid: pidContent?.pid });
        return 0;
      }

      // Spawn detached daemon process
      this.logger.info('Starting Neura daemon...');
      const child = this.processService.spawnDaemon();

      // Wait a moment for the child to start and write its PID
      await this.delay(500);

      // Verify the child started successfully
      if (!this.processService.sendSignal(child.pid ?? 0)) {
        this.logger.error('Failed to start daemon process');
        return 1;
      }

      // The child process will write its own PID file
      // Parent just needs to unref and exit
      child.unref();

      this.logger.info('Neura daemon started successfully', { pid: child.pid });
      return 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Failed to start daemon',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return 1;
    }
  }

  /**
   * Stop the daemon
   * @returns exit code (0 for success, 1 for error)
   */
  public async stop(): Promise<number> {
    try {
      // Check if running
      const isRunning = await this.pidService.validateAndCleanup();
      if (!isRunning) {
        this.logger.info('Neura is not running');
        return 0;
      }

      const pidContent = await this.pidService.readPid();
      if (!pidContent) {
        this.logger.info('Neura is not running');
        return 0;
      }

      this.logger.info('Stopping Neura daemon...', { pid: pidContent.pid });

      // Send SIGTERM for graceful shutdown
      const signalSent = this.processService.sendSignal(pidContent.pid, 'SIGTERM');
      if (!signalSent) {
        this.logger.warn('Failed to send signal to daemon, it may have already stopped');
        await this.pidService.removePid();
        return 0;
      }

      // Wait for graceful shutdown (5 seconds timeout)
      const terminated = await this.processService.waitForTermination(pidContent.pid, 5000);

      if (terminated) {
        this.logger.info('Neura daemon stopped successfully');
      } else {
        // Graceful shutdown timed out, force kill
        this.logger.warn('Graceful shutdown timed out, forcing termination...');
        const killed = this.processService.forceKill(pidContent.pid);

        if (killed) {
          this.logger.info('Neura daemon force stopped');
        } else {
          this.logger.error('Failed to stop daemon');
          return 1;
        }
      }

      // Clean up PID file
      await this.pidService.removePid();

      return 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Failed to stop daemon',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return 1;
    }
  }

  /**
   * Check daemon status
   * @returns exit code (0 for running, 1 for not running)
   */
  public async status(): Promise<number> {
    try {
      const isRunning = await this.pidService.validateAndCleanup();

      if (isRunning) {
        const pidContent = await this.pidService.readPid();
        this.logger.info('Neura is running', {
          pid: pidContent?.pid,
          version: pidContent?.version,
          startTime: pidContent?.startTime
            ? new Date(pidContent.startTime).toISOString()
            : undefined,
        });
        return 0;
      } else {
        this.logger.info('Neura is not running');
        return 1;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Failed to check status',
        error instanceof Error ? error : new Error(errorMessage)
      );
      return 1;
    }
  }

  /**
   * Small delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
  }
}
