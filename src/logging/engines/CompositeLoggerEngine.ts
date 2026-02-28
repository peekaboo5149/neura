import type { ILoggerEngine, LogEntry } from '../interfaces/ILoggerEngine';
import { LogLevel } from '../LogLevel';

/**
 * CompositeLoggerEngine - Combines multiple logger engines
 *
 * Routes log entries to multiple engines simultaneously.
 * Useful for logging to both console and file.
 *
 * Features:
 * - Routes to all registered engines
 * - Manages engine lifecycle (disposal)
 * - Preserves ILoggerEngine interface
 * - Handles individual engine failures gracefully
 */
export class CompositeLoggerEngine implements ILoggerEngine {
  private engines: ILoggerEngine[];
  private level: LogLevel;

  constructor(engines: ILoggerEngine[], level: LogLevel = LogLevel.INFO) {
    this.engines = [...engines];
    this.level = level;
  }

  /**
   * Log to all registered engines
   */
  public log(entry: LogEntry): void {
    for (const engine of this.engines) {
      try {
        engine.log(entry);
      } catch (error) {
        // Log to stderr but continue with other engines
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Engine logging failed: ${errorMessage}`);
      }
    }
  }

  /**
   * Set log level on all engines
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
    for (const engine of this.engines) {
      try {
        engine.setLevel(level);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to set level on engine: ${errorMessage}`);
      }
    }
  }

  /**
   * Get the current log level
   */
  public getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Add an engine to the composite
   */
  public addEngine(engine: ILoggerEngine): void {
    this.engines.push(engine);
  }

  /**
   * Remove an engine from the composite
   */
  public removeEngine(engine: ILoggerEngine): void {
    const index = this.engines.indexOf(engine);
    if (index > -1) {
      this.engines.splice(index, 1);
    }
  }

  /**
   * Get all registered engines
   */
  public getEngines(): readonly ILoggerEngine[] {
    return [...this.engines];
  }

  /**
   * Dispose of all engines that support disposal
   */
  public dispose(): void {
    for (const engine of this.engines) {
      if (typeof engine.dispose === 'function') {
        try {
          engine.dispose();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Engine disposal failed: ${errorMessage}`);
        }
      }
    }
    this.engines = [];
  }
}
