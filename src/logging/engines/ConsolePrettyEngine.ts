import type { ILoggerEngine, LogEntry } from '../interfaces/ILoggerEngine';
import { LogLevel, LogLevelNames, shouldLogLevelOutput } from '../LogLevel';

/**
 * ANSI color codes for terminal output
 */
const Colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
} as const;

/**
 * Color mapping for log levels
 */
const LevelColors: Record<LogLevel, string> = {
  [LogLevel.TRACE]: Colors.gray,
  [LogLevel.DEBUG]: Colors.cyan,
  [LogLevel.INFO]: Colors.green,
  [LogLevel.WARN]: Colors.yellow,
  [LogLevel.ERROR]: Colors.red,
  [LogLevel.FATAL]: Colors.magenta,
  [LogLevel.SILENT]: Colors.hidden,
};

/**
 * ConsolePrettyEngine - Human-readable, colorized console output for development
 * Produces NestJS-style formatted logs with colors and clear structure
 */
export class ConsolePrettyEngine implements ILoggerEngine {
  private level: LogLevel;
  private readonly includeTimestamp: boolean;
  private readonly output: NodeJS.WriteStream;

  /**
   * Reusable date formatter to avoid repeated creation
   */
  private readonly dateFormatter: Intl.DateTimeFormat;

  constructor(
    level: LogLevel = LogLevel.INFO,
    includeTimestamp: boolean = true,
    output: NodeJS.WriteStream = process.stdout
  ) {
    this.level = level;
    this.includeTimestamp = includeTimestamp;
    this.output = output;

    // Create formatter once for performance
    this.dateFormatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  public log(entry: LogEntry): void {
    if (!shouldLogLevelOutput(entry.level, this.level)) {
      return;
    }

    const output = this.formatEntry(entry);
    this.output.write(output + '\n');
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Format a log entry into a human-readable string
   */
  private formatEntry(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    if (this.includeTimestamp) {
      parts.push(this.formatTimestamp(entry.timestamp));
    }

    // Context name
    parts.push(this.formatContext(entry.context));

    // Log level with color
    parts.push(this.formatLevel(entry.level));

    // Trace context
    const traceInfo = this.formatTraceContext(entry);
    if (traceInfo) {
      parts.push(traceInfo);
    }

    // Message
    parts.push(entry.message);

    // Metadata
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      parts.push(this.formatMetadata(entry.metadata));
    }

    // Error with stack trace
    if (entry.error) {
      parts.push(this.formatError(entry.error));
    }

    return parts.join(' ');
  }

  /**
   * Format timestamp
   */
  private formatTimestamp(date: Date): string {
    const formatted = this.dateFormatter.format(date);
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${Colors.dim}${formatted}.${ms}${Colors.reset}`;
  }

  /**
   * Format context name
   */
  private formatContext(context: string): string {
    return `${Colors.yellow}[${context}]${Colors.reset}`;
  }

  /**
   * Format log level with color
   */
  private formatLevel(level: LogLevel): string {
    const levelName = LogLevelNames[level];
    const color = LevelColors[level];
    const paddedName = levelName.padEnd(5);
    return `${color}${paddedName}${Colors.reset}`;
  }

  /**
   * Format trace context information
   */
  private formatTraceContext(entry: LogEntry): string | null {
    const parts: string[] = [];

    if (entry.traceId) {
      parts.push(`${Colors.dim}traceId=${entry.traceId.slice(0, 8)}${Colors.reset}`);
    }

    if (entry.spanId) {
      parts.push(`${Colors.dim}spanId=${entry.spanId.slice(0, 8)}${Colors.reset}`);
    }

    if (entry.correlationId) {
      parts.push(`${Colors.dim}corrId=${entry.correlationId.slice(0, 8)}${Colors.reset}`);
    }

    return parts.length > 0 ? parts.join(' ') : null;
  }

  /**
   * Format metadata as key=value pairs
   */
  private formatMetadata(metadata: Record<string, unknown>): string {
    const pairs = Object.entries(metadata).map(([key, value]) => {
      const formattedValue = this.formatValue(value);
      return `${Colors.cyan}${key}${Colors.reset}=${formattedValue}`;
    });

    return pairs.join(' ');
  }

  /**
   * Format a value for display
   */
  private formatValue(value: unknown): string {
    if (value === null) {
      return `${Colors.dim}null${Colors.reset}`;
    }

    if (value === undefined) {
      return `${Colors.dim}undefined${Colors.reset}`;
    }

    if (typeof value === 'string') {
      return `"${value}"`;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return `${Colors.green}${value}${Colors.reset}`;
    }

    if (value instanceof Date) {
      return `${Colors.dim}${value.toISOString()}${Colors.reset}`;
    }

    if (Array.isArray(value)) {
      return `[${value.map((v) => this.formatValue(v)).join(', ')}]`;
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[Object]';
      }
    }

    return String(value);
  }

  /**
   * Format error with stack trace
   */
  private formatError(error: Error): string {
    const lines: string[] = [''];

    lines.push(`${Colors.red}${error.name}: ${error.message}${Colors.reset}`);

    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(1); // Skip the first line (message)
      stackLines.forEach((line) => {
        lines.push(`  ${Colors.dim}${line.trim()}${Colors.reset}`);
      });
    }

    return lines.join('\n');
  }
}
