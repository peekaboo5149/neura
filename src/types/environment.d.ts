/**
 * Environment variable type declarations
 * Provides type safety for process.env access
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * Node environment
       */
      readonly NODE_ENV?: 'development' | 'production' | 'test';

      /**
       * Minimum log level to output
       * @default 'INFO'
       */
      readonly LOG_LEVEL?: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'SILENT';

      /**
       * Output logs in JSON format
       * @default 'false' in development, 'true' in production
       */
      readonly LOG_JSON?: 'true' | 'false';

      /**
       * Include timestamp in log output
       * @default 'true'
       */
      readonly LOG_TIMESTAMP?: 'true' | 'false';

      /**
       * Enable pretty printing for console output
       * @default 'true' in development
       */
      readonly LOG_PRETTY?: 'true' | 'false';

      /**
       * Redact sensitive fields from logs
       * @default 'true'
       */
      readonly LOG_REDACT_SENSITIVE?: 'true' | 'false';

      /**
       * Custom mask string for redacted values
       * @default '[REDACTED]'
       */
      readonly LOG_REDACT_MASK?: string;

      /**
       * Application name for structured logging
       */
      readonly APP_NAME?: string;

      /**
       * Application version for structured logging
       */
      readonly APP_VERSION?: string;

      /**
       * Port for HTTP server
       * @default 3000
       */
      readonly PORT?: string;

      /**
       * Host for HTTP server
       * @default 'localhost'
       */
      readonly HOST?: string;

      /**
       * Database connection URL
       */
      readonly DATABASE_URL?: string;

      /**
       * Redis connection URL
       */
      readonly REDIS_URL?: string;

      /**
       * JWT secret for authentication
       */
      readonly JWT_SECRET?: string;

      /**
       * API key for external services
       */
      readonly API_KEY?: string;

      /**
       * Enable debug mode
       * @default 'false'
       */
      readonly DEBUG?: 'true' | 'false';
    }
  }
}

export { };

