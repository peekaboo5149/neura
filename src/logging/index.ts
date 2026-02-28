/**
 * OpenClaw Logging Module
 *
 * Enterprise-grade logging framework with:
 * - Clean architecture and full abstraction
 * - Trace context propagation via AsyncLocalStorage
 * - Multiple output engines (pretty console, JSON)
 * - Structured logging with metadata support
 * - Automatic sensitive field redaction
 * - OpenTelemetry compatible trace context
 */

// Core exports
export { Logger } from './Logger';
export { createLoggerEngine, EngineType, LoggerFactory } from './LoggerFactory';
export { LogLevel, LogLevelNames, parseLogLevel, shouldLogLevelOutput } from './LogLevel';

// Configuration
export {
  getLoggerConfig,
  LoggerConfig,
  resetLoggerConfig,
  setLoggerConfig,
} from './config/LoggerConfig';
export type { LoggerConfigOptions } from './config/LoggerConfig';

// Interfaces
export type { ILogger, LoggerOptions, LogMessage } from './interfaces/ILogger';
export type { ILoggerEngine, LogEntry, LoggerEngineFactory } from './interfaces/ILoggerEngine';
export { DEFAULT_SENSITIVE_FIELDS, redactMetadata } from './interfaces/LogMetadata';
export type {
  LogMetadata,
  RedactionConfig,
  SerializableLogMetadata,
} from './interfaces/LogMetadata';

// Context
export {
  AsyncContextManager,
  getCurrentTraceContext,
  runWithTraceContext,
  runWithTraceContextAsync,
} from './context/AsyncContextManager';
export {
  createChildTraceContext,
  createTraceContext,
  generateCorrelationId,
  generateSpanId,
  generateTraceId,
  isValidTraceContext,
} from './context/TraceContext';
export type { TraceContext } from './context/TraceContext';

// Engines
export { ConsolePrettyEngine } from './engines/ConsolePrettyEngine';
export { JsonConsoleEngine } from './engines/JsonConsoleEngine';
