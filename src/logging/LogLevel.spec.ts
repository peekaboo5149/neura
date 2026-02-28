import { LogLevel, LogLevelNames, parseLogLevel, shouldLogLevelOutput } from './LogLevel';

describe('LogLevel', () => {
  describe('LogLevel enum', () => {
    it('should have correct numeric values', () => {
      expect(LogLevel.TRACE).toBe(0);
      expect(LogLevel.DEBUG).toBe(1);
      expect(LogLevel.INFO).toBe(2);
      expect(LogLevel.WARN).toBe(3);
      expect(LogLevel.ERROR).toBe(4);
      expect(LogLevel.FATAL).toBe(5);
      expect(LogLevel.SILENT).toBe(6);
    });
  });

  describe('LogLevelNames', () => {
    it('should map levels to correct names', () => {
      expect(LogLevelNames[LogLevel.TRACE]).toBe('TRACE');
      expect(LogLevelNames[LogLevel.DEBUG]).toBe('DEBUG');
      expect(LogLevelNames[LogLevel.INFO]).toBe('INFO');
      expect(LogLevelNames[LogLevel.WARN]).toBe('WARN');
      expect(LogLevelNames[LogLevel.ERROR]).toBe('ERROR');
      expect(LogLevelNames[LogLevel.FATAL]).toBe('FATAL');
      expect(LogLevelNames[LogLevel.SILENT]).toBe('SILENT');
    });
  });

  describe('parseLogLevel', () => {
    it('should parse valid level strings', () => {
      expect(parseLogLevel('TRACE')).toBe(LogLevel.TRACE);
      expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
      expect(parseLogLevel('INFO')).toBe(LogLevel.INFO);
      expect(parseLogLevel('WARN')).toBe(LogLevel.WARN);
      expect(parseLogLevel('ERROR')).toBe(LogLevel.ERROR);
      expect(parseLogLevel('FATAL')).toBe(LogLevel.FATAL);
      expect(parseLogLevel('SILENT')).toBe(LogLevel.SILENT);
    });

    it('should be case-insensitive', () => {
      expect(parseLogLevel('trace')).toBe(LogLevel.TRACE);
      expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
      expect(parseLogLevel('Info')).toBe(LogLevel.INFO);
    });

    it('should handle WARNING as WARN', () => {
      expect(parseLogLevel('WARNING')).toBe(LogLevel.WARN);
      expect(parseLogLevel('warning')).toBe(LogLevel.WARN);
    });

    it('should default to INFO for undefined', () => {
      expect(parseLogLevel(undefined)).toBe(LogLevel.INFO);
    });

    it('should default to INFO for invalid values', () => {
      expect(parseLogLevel('invalid')).toBe(LogLevel.INFO);
      expect(parseLogLevel('')).toBe(LogLevel.INFO);
      expect(parseLogLevel('unknown')).toBe(LogLevel.INFO);
    });

    it('should trim whitespace', () => {
      expect(parseLogLevel('  DEBUG  ')).toBe(LogLevel.DEBUG);
      expect(parseLogLevel('\tINFO\n')).toBe(LogLevel.INFO);
    });
  });

  describe('shouldLogLevelOutput', () => {
    it('should return true when message level >= minimum level', () => {
      expect(shouldLogLevelOutput(LogLevel.INFO, LogLevel.DEBUG)).toBe(true);
      expect(shouldLogLevelOutput(LogLevel.ERROR, LogLevel.WARN)).toBe(true);
      expect(shouldLogLevelOutput(LogLevel.FATAL, LogLevel.ERROR)).toBe(true);
    });

    it('should return false when message level < minimum level', () => {
      expect(shouldLogLevelOutput(LogLevel.DEBUG, LogLevel.INFO)).toBe(false);
      expect(shouldLogLevelOutput(LogLevel.INFO, LogLevel.WARN)).toBe(false);
      expect(shouldLogLevelOutput(LogLevel.WARN, LogLevel.ERROR)).toBe(false);
    });

    it('should return true for same level', () => {
      expect(shouldLogLevelOutput(LogLevel.INFO, LogLevel.INFO)).toBe(true);
      expect(shouldLogLevelOutput(LogLevel.ERROR, LogLevel.ERROR)).toBe(true);
    });

    it('should return false for SILENT level', () => {
      expect(shouldLogLevelOutput(LogLevel.INFO, LogLevel.SILENT)).toBe(false);
      expect(shouldLogLevelOutput(LogLevel.ERROR, LogLevel.SILENT)).toBe(false);
      expect(shouldLogLevelOutput(LogLevel.FATAL, LogLevel.SILENT)).toBe(false);
    });

    it('should handle all level combinations', () => {
      // When minimum is TRACE, everything except SILENT should log
      expect(shouldLogLevelOutput(LogLevel.TRACE, LogLevel.TRACE)).toBe(true);
      expect(shouldLogLevelOutput(LogLevel.DEBUG, LogLevel.TRACE)).toBe(true);
      expect(shouldLogLevelOutput(LogLevel.FATAL, LogLevel.TRACE)).toBe(true);

      // When minimum is FATAL, only FATAL should log
      expect(shouldLogLevelOutput(LogLevel.ERROR, LogLevel.FATAL)).toBe(false);
      expect(shouldLogLevelOutput(LogLevel.FATAL, LogLevel.FATAL)).toBe(true);
    });
  });
});
