import { createWriteStream, type WriteStream } from 'fs';
import { mkdir, readdir, stat, unlink } from 'fs/promises';
import { homedir } from 'os';
import { isAbsolute, join, relative, resolve } from 'path';

/**
 * LogFileService - Safe file operations for log management
 *
 * Provides cross-platform log directory management with safety checks:
 * - All paths resolved to absolute before operations
 * - Path validation ensures operations stay within log directory
 * - No symlink following outside target directory
 * - Safe deletion with confirmation
 */
export class LogFileService {
  private readonly logDirectory: string;

  constructor(customDirectory?: string) {
    this.logDirectory = this.resolveLogDirectory(customDirectory);
  }

  /**
   * Get the resolved log directory path
   */
  public getLogDirectory(): string {
    return this.logDirectory;
  }

  /**
   * Ensure the log directory exists (creates recursively if missing)
   */
  public async ensureLogDirectory(): Promise<void> {
    try {
      await mkdir(this.logDirectory, { recursive: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create log directory at ${this.logDirectory}: ${errorMessage}`, {
        cause: error,
      });
    }
  }

  /**
   * Get the log file path for a specific date
   * Format: neura-YYYY-MM-DD.log
   */
  public getLogFilePath(date: Date): string {
    const dateStr = this.formatDate(date);
    const filename = `neura-${dateStr}.log`;
    return join(this.logDirectory, filename);
  }

  /**
   * Get the current log file path (for today)
   */
  public getCurrentLogFilePath(): string {
    return this.getLogFilePath(new Date());
  }

  /**
   * Create a write stream for the specified log file
   */
  public createWriteStream(filePath: string): WriteStream {
    this.validatePath(filePath);
    return createWriteStream(filePath, { flags: 'a' });
  }

  /**
   * Clean up log files older than retention days
   * Returns the number of files deleted
   */
  public async cleanupOldLogs(retentionDays: number): Promise<number> {
    this.validateRetentionDays(retentionDays);

    try {
      const files = await this.getLogFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let deletedCount = 0;

      for (const file of files) {
        const filePath = join(this.logDirectory, file);
        const fileDate = this.extractDateFromFilename(file);

        if (fileDate && fileDate < cutoffDate) {
          try {
            await unlink(filePath);
            deletedCount++;
          } catch (error) {
            // Log but continue - don't fail cleanup for one file
            console.warn(
              `Failed to delete old log file ${file}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      }

      return deletedCount;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // Directory doesn't exist, nothing to clean up
        return 0;
      }
      throw error;
    }
  }

  /**
   * Clear all log files from the directory
   * Returns the number of files deleted
   */
  public async clearAllLogs(): Promise<number> {
    try {
      const files = await this.getLogFiles();
      let deletedCount = 0;

      for (const file of files) {
        const filePath = join(this.logDirectory, file);
        this.validatePath(filePath);

        try {
          await unlink(filePath);
          deletedCount++;
        } catch (error) {
          // Log but continue - don't fail for one file
          console.warn(
            `Failed to delete log file ${file}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      return deletedCount;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // Directory doesn't exist, nothing to clear
        return 0;
      }
      throw error;
    }
  }

  /**
   * Check if the log directory exists
   */
  public async directoryExists(): Promise<boolean> {
    try {
      const stats = await stat(this.logDirectory);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get all log files in the directory
   */
  public async getLogFiles(): Promise<string[]> {
    try {
      const entries = await readdir(this.logDirectory);
      return entries.filter((file) => file.endsWith('.log'));
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Validate that a path is within the log directory
   * @throws Error if path is outside log directory
   */
  public validatePath(filePath: string): void {
    const resolvedPath = resolve(filePath);
    const resolvedLogDir = resolve(this.logDirectory);

    // Ensure the path is within the log directory
    const relativePath = relative(resolvedLogDir, resolvedPath);

    if (relativePath.startsWith('..') || relativePath === '') {
      throw new Error(
        `Path validation failed: ${filePath} is outside the log directory ${this.logDirectory}`
      );
    }
  }

  /**
   * Resolve the log directory path
   */
  private resolveLogDirectory(customDirectory?: string): string {
    if (customDirectory) {
      return isAbsolute(customDirectory) ? customDirectory : resolve(customDirectory);
    }

    // Default: ~/.neura/logs
    return join(homedir(), '.neura', 'logs');
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Extract date from log filename
   * Returns null if filename doesn't match expected pattern
   */
  private extractDateFromFilename(filename: string): Date | null {
    const match = filename.match(/^neura-(\d{4})-(\d{2})-(\d{2})\.log$/);
    if (!match) {
      return null;
    }

    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    // Validate the date is valid
    if (
      date.getFullYear() !== Number(year) ||
      date.getMonth() !== Number(month) - 1 ||
      date.getDate() !== Number(day)
    ) {
      return null;
    }

    return date;
  }

  /**
   * Validate retention days parameter
   */
  private validateRetentionDays(days: number): void {
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new Error(`Invalid retention days: ${days}. Must be an integer between 1 and 365.`);
    }
  }
}

/**
 * Singleton instance for global use
 */
let globalLogFileService: LogFileService | null = null;

/**
 * Get the global LogFileService instance
 */
export function getLogFileService(customDirectory?: string): LogFileService {
  if (!globalLogFileService) {
    globalLogFileService = new LogFileService(customDirectory);
  }
  return globalLogFileService;
}

/**
 * Reset the global instance (useful for testing)
 */
export function resetLogFileService(): void {
  globalLogFileService = null;
}
