import { mkdir } from 'fs/promises';
import { homedir } from 'os';
import { isAbsolute, join, relative, resolve } from 'path';

/**
 * NeuraHomeService - Manages the Neura home directory structure
 *
 * Provides safe access to ~/.neura/ directory and its subdirectories:
 * - logs/ - Log files
 * - neura.pid - PID file
 * - neura.sock - UNIX domain socket (future IPC)
 *
 * All paths are resolved safely and validated to prevent directory traversal.
 */
export class NeuraHomeService {
  private readonly homeDirectory: string;

  constructor(customHome?: string) {
    this.homeDirectory = this.resolveHomeDirectory(customHome);
  }

  /**
   * Get the Neura home directory path (~/.neura)
   */
  public getHomeDirectory(): string {
    return this.homeDirectory;
  }

  /**
   * Get the logs directory path (~/.neura/logs)
   */
  public getLogsDirectory(): string {
    return join(this.homeDirectory, 'logs');
  }

  /**
   * Get the PID file path (~/.neura/neura.pid)
   */
  public getPidFilePath(): string {
    return join(this.homeDirectory, 'neura.pid');
  }

  /**
   * Get the socket file path (~/.neura/neura.sock)
   */
  public getSocketPath(): string {
    return join(this.homeDirectory, 'neura.sock');
  }

  /**
   * Ensure the home directory exists (creates recursively if missing)
   * Also creates the logs subdirectory
   */
  public async ensureHomeDirectory(): Promise<void> {
    try {
      // Create main home directory
      await mkdir(this.homeDirectory, { recursive: true });

      // Create logs subdirectory
      await mkdir(this.getLogsDirectory(), { recursive: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to create Neura home directory at ${this.homeDirectory}: ${errorMessage}`,
        { cause: error }
      );
    }
  }

  /**
   * Validate that a path is within the Neura home directory
   * @throws Error if path is outside home directory
   */
  public validatePath(filePath: string): void {
    const resolvedPath = resolve(filePath);
    const resolvedHomeDir = resolve(this.homeDirectory);

    // Ensure the path is within the home directory
    const relativePath = relative(resolvedHomeDir, resolvedPath);

    if (relativePath.startsWith('..') || relativePath === '') {
      throw new Error(
        `Path validation failed: ${filePath} is outside the Neura home directory ${this.homeDirectory}`
      );
    }
  }

  /**
   * Resolve the home directory path
   */
  private resolveHomeDirectory(customHome?: string): string {
    if (customHome) {
      return isAbsolute(customHome) ? customHome : resolve(customHome);
    }

    // Default: ~/.neura
    return join(homedir(), '.neura');
  }
}

/**
 * Singleton instance for global use
 */
let globalNeuraHomeService: NeuraHomeService | null = null;

/**
 * Get the global NeuraHomeService instance
 */
export function getNeuraHomeService(customHome?: string): NeuraHomeService {
  if (!globalNeuraHomeService) {
    globalNeuraHomeService = new NeuraHomeService(customHome);
  }
  return globalNeuraHomeService;
}

/**
 * Reset the global instance (useful for testing)
 */
export function resetNeuraHomeService(): void {
  globalNeuraHomeService = null;
}
