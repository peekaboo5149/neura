import { ConsolePrettyEngine } from '@logging/engines/ConsolePrettyEngine';
import type { LogEntry } from '@logging/interfaces/ILoggerEngine';
import type { LogMetadata } from '@logging/interfaces/LogMetadata';
import { LogLevel } from '@logging/LogLevel';
import { LogFileService } from '@logging/services/LogFileService';

/**
 * ClearLogsCommand - Handles the clearlogs CLI command
 *
 * Safely deletes all log files from the configured log directory.
 * Uses a minimal console logger for output (no file logging during cleanup).
 */
export class ClearLogsCommand {
  private readonly logFileService: LogFileService;
  private readonly consoleEngine: ConsolePrettyEngine;

  constructor(customDirectory?: string) {
    this.logFileService = new LogFileService(customDirectory);
    // Use a simple console engine for logging (no file logging during cleanup)
    this.consoleEngine = new ConsolePrettyEngine(LogLevel.INFO, true, process.stdout);
  }

  /**
   * Execute the clear logs command
   * Returns exit code (0 for success, 1 for error)
   */
  public async execute(): Promise<number> {
    try {
      // Check if log directory exists
      const directoryExists = await this.logFileService.directoryExists();

      if (!directoryExists) {
        this.logInfo('Log directory does not exist', {
          directory: this.logFileService.getLogDirectory(),
        });
        return 0;
      }

      // Get log files before deletion for reporting
      const logFiles = await this.logFileService.getLogFiles();

      if (logFiles.length === 0) {
        this.logInfo('No log files to clear', {
          directory: this.logFileService.getLogDirectory(),
        });
        return 0;
      }

      // Clear all logs
      const deletedCount = await this.logFileService.clearAllLogs();

      // Log summary
      this.logInfo('Log cleanup completed', {
        directory: this.logFileService.getLogDirectory(),
        filesFound: logFiles.length,
        filesDeleted: deletedCount,
        files: logFiles,
      });

      return 0;
    } catch (error) {
      this.logError(
        'Failed to clear logs',
        error instanceof Error ? error : new Error(String(error))
      );
      return 1;
    }
  }

  /**
   * Log an info message
   */
  private logInfo(message: string, metadata?: LogMetadata): void {
    const entry: LogEntry = {
      level: LogLevel.INFO,
      message,
      context: 'ClearLogs',
      timestamp: new Date(),
      metadata,
    };
    this.consoleEngine.log(entry);
  }

  /**
   * Log an error message
   */
  private logError(message: string, error: Error): void {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      context: 'ClearLogs',
      timestamp: new Date(),
      error,
    };
    this.consoleEngine.log(entry);
  }
}

/**
 * Execute the clearlogs command
 * Returns exit code (0 for success, 1 for error)
 */
export async function executeClearLogs(customDirectory?: string): Promise<number> {
  const command = new ClearLogsCommand(customDirectory);
  return command.execute();
}
