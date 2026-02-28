import { LogLevel } from './LogLevel';
import { Logger } from './Logger';
import type { ILoggerEngine, LogEntry } from './interfaces/ILoggerEngine';
import type { LogMetadata } from './interfaces/LogMetadata';

/**
 * Mock engine for testing
 * Captures all log entries for verification
 */
class MockLoggerEngine implements ILoggerEngine {
  public entries: LogEntry[] = [];
  private level: LogLevel = LogLevel.DEBUG;

  log(entry: LogEntry): void {
    this.entries.push(entry);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }
}

describe('Logger', () => {
  let engine: MockLoggerEngine;
  let logger: Logger;

  beforeEach(() => {
    engine = new MockLoggerEngine();
    logger = new Logger('TestContext', {}, engine);
  });

  describe('basic logging', () => {
    it('should log info messages', () => {
      logger.info('Test message');

      expect(engine.entries).toHaveLength(1);
      expect(engine.entries[0]).toMatchObject({
        level: LogLevel.INFO,
        message: 'Test message',
        context: 'TestContext',
      });
    });

    it('should log debug messages', () => {
      logger.debug('Debug message');

      expect(engine.entries).toHaveLength(1);
      expect(engine.entries[0].level).toBe(LogLevel.DEBUG);
    });

    it('should log warn messages', () => {
      logger.warn('Warning message');

      expect(engine.entries).toHaveLength(1);
      expect(engine.entries[0].level).toBe(LogLevel.WARN);
    });

    it('should log error messages', () => {
      logger.error('Error message');

      expect(engine.entries).toHaveLength(1);
      expect(engine.entries[0].level).toBe(LogLevel.ERROR);
    });

    it('should log fatal messages', () => {
      logger.fatal('Fatal message');

      expect(engine.entries).toHaveLength(1);
      expect(engine.entries[0].level).toBe(LogLevel.FATAL);
    });

    it('should log trace messages', () => {
      engine.setLevel(LogLevel.TRACE);
      logger.trace('Trace message');

      expect(engine.entries).toHaveLength(1);
      expect(engine.entries[0].level).toBe(LogLevel.TRACE);
    });
  });

  describe('lazy message evaluation', () => {
    it('should evaluate lazy messages', () => {
      const lazyMessage = jest.fn(() => 'Lazy message');

      logger.info(lazyMessage);

      expect(lazyMessage).toHaveBeenCalled();
      expect(engine.entries[0].message).toBe('Lazy message');
    });

    it('should not evaluate lazy messages when level is disabled', () => {
      engine.setLevel(LogLevel.ERROR);
      const lazyMessage = jest.fn(() => 'Lazy message');

      logger.info(lazyMessage);

      expect(lazyMessage).not.toHaveBeenCalled();
      expect(engine.entries).toHaveLength(0);
    });
  });

  describe('metadata handling', () => {
    it('should include metadata in log entries', () => {
      const metadata: LogMetadata = { userId: '123', action: 'login' };

      logger.info('User action', metadata);

      expect(engine.entries[0].metadata).toMatchObject(metadata);
    });

    it('should merge metadata from options', () => {
      const optionsMetadata: LogMetadata = { service: 'auth' };
      const logMetadata: LogMetadata = { action: 'login' };
      const optionsLogger = new Logger('Test', { metadata: optionsMetadata }, engine);

      optionsLogger.info('Action', logMetadata);

      expect(engine.entries[0].metadata).toMatchObject({
        service: 'auth',
        action: 'login',
      });
    });
  });

  describe('error handling', () => {
    it('should include error in log entry', () => {
      const error = new Error('Test error');

      logger.error('Error occurred', error);

      expect(engine.entries[0].error).toBe(error);
    });

    it('should include error and metadata', () => {
      const error = new Error('Test error');
      const metadata: LogMetadata = { userId: '123' };

      logger.error('Error occurred', error, metadata);

      expect(engine.entries[0].error).toBe(error);
      expect(engine.entries[0].metadata).toMatchObject(metadata);
    });
  });

  describe('child logger', () => {
    it('should create child logger with merged metadata', () => {
      const parentMetadata: LogMetadata = { service: 'auth' };
      const childMetadata: LogMetadata = { action: 'login' };
      const parentLogger = new Logger('Parent', { metadata: parentMetadata }, engine);

      const childLogger = parentLogger.child(childMetadata);
      childLogger.info('Child message');

      expect(engine.entries[0].metadata).toMatchObject({
        service: 'auth',
        action: 'login',
      });
    });

    it('should maintain same context in child logger', () => {
      const childLogger = logger.child({ extra: 'data' });
      childLogger.info('Child message');

      expect(engine.entries[0].context).toBe('TestContext');
    });
  });

  describe('timestamp', () => {
    it('should include timestamp in log entries', () => {
      const before = new Date();
      logger.info('Test');
      const after = new Date();

      const entryTime = engine.entries[0].timestamp;
      expect(entryTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entryTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('log level filtering', () => {
    it('should filter messages below minimum level', () => {
      engine.setLevel(LogLevel.WARN);

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      expect(engine.entries).toHaveLength(2);
      expect(engine.entries[0].level).toBe(LogLevel.WARN);
      expect(engine.entries[1].level).toBe(LogLevel.ERROR);
    });
  });
});
