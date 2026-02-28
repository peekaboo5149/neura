import { readFile, unlink, writeFile } from 'fs/promises';
import type { NeuraHomeService } from './neura-home.service';

/**
 * PID file content structure
 */
export interface PidFileContent {
  /** Process ID */
  pid: number;
  /** Process start time (for validation) */
  startTime: number;
  /** Neura version */
  version: string;
}

/**
 * PidService - Manages the PID file for daemon process tracking
 *
 * Responsibilities:
 * - Write PID file atomically
 * - Read and parse PID file
 * - Validate running processes
 * - Cleanup stale PID files
 * - Safe file operations with path validation
 */
export class PidService {
  private readonly pidFilePath: string;

  constructor(homeService: NeuraHomeService) {
    this.pidFilePath = homeService.getPidFilePath();
  }

  /**
   * Get the PID file path
   */
  public getPidFilePath(): string {
    return this.pidFilePath;
  }

  /**
   * Write the PID file atomically
   * Uses temp file + rename pattern for atomicity
   */
  public async writePid(): Promise<void> {
    const content: PidFileContent = {
      pid: process.pid,
      startTime: Date.now(),
      version: process.env.npm_package_version ?? '1.0.0',
    };

    const tempFile = `${this.pidFilePath}.tmp`;
    const jsonContent = JSON.stringify(content, null, 2);

    try {
      // Write to temp file first (atomic operation)
      await writeFile(tempFile, jsonContent, { mode: 0o644 });

      // Rename temp file to actual PID file (atomic on POSIX)
      await this.atomicRename(tempFile, this.pidFilePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await unlink(tempFile);
      } catch {
        // Ignore cleanup errors
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to write PID file: ${errorMessage}`, { cause: error });
    }
  }

  /**
   * Read and parse the PID file
   * @returns PidFileContent or null if file doesn't exist
   */
  public async readPid(): Promise<PidFileContent | null> {
    try {
      const content = await readFile(this.pidFilePath, 'utf-8');
      const parsed = JSON.parse(content) as PidFileContent;

      // Validate structure
      if (
        typeof parsed.pid !== 'number' ||
        typeof parsed.startTime !== 'number' ||
        typeof parsed.version !== 'string'
      ) {
        return null;
      }

      return parsed;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // File doesn't exist
        return null;
      }

      // Corrupted or unreadable file
      return null;
    }
  }

  /**
   * Remove the PID file
   */
  public async removePid(): Promise<void> {
    try {
      await unlink(this.pidFilePath);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // File doesn't exist, that's fine
        return;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to remove PID file: ${errorMessage}`, { cause: error });
    }
  }

  /**
   * Check if a process is running
   * Uses process.kill(pid, 0) which checks if process exists without sending a signal
   */
  public isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate the PID file and cleanup if stale
   * @returns true if a valid process is running, false otherwise
   */
  public async validateAndCleanup(): Promise<boolean> {
    const pidContent = await this.readPid();

    if (!pidContent) {
      // No PID file exists
      return false;
    }

    // Check if process is running
    if (this.isProcessRunning(pidContent.pid)) {
      // Process is running, validate it's actually Neura
      // (We could add additional validation here if needed)
      return true;
    }

    // Process is not running, clean up stale PID file
    try {
      await this.removePid();
    } catch {
      // Ignore cleanup errors
    }

    return false;
  }

  /**
   * Atomic rename operation
   * On Windows, this may not be truly atomic, but it's the best we can do
   */
  private async atomicRename(oldPath: string, newPath: string): Promise<void> {
    const { rename } = await import('fs/promises');
    await rename(oldPath, newPath);
  }
}
