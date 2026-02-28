import { executeClearLogs } from './commands/clearLogs';

/**
 * CLI Command types
 */
export type CliCommand = 'clearlogs' | 'help' | 'version' | 'unknown';

/**
 * Parse CLI arguments to determine command
 */
export function parseCommand(args: string[]): { command: CliCommand; args: string[] } {
  if (args.length === 0) {
    return { command: 'unknown', args: [] };
  }

  const command = args[0].toLowerCase();

  switch (command) {
    case 'clearlogs':
    case 'clear-logs':
    case 'clear_logs':
      return { command: 'clearlogs', args: args.slice(1) };

    case 'help':
    case '--help':
    case '-h':
      return { command: 'help', args: args.slice(1) };

    case 'version':
    case '--version':
    case '-v':
      return { command: 'version', args: args.slice(1) };

    default:
      return { command: 'unknown', args };
  }
}

/**
 * Display help information
 */
export function showHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`
Neura - Intelligent Personal Assistant Framework

Usage:
  neura [command]

Commands:
  (no command)    Start the server normally
  clearlogs       Delete all log files from ~/.neura/logs
  help            Show this help message
  version         Show version information

Environment Variables:
  NODE_ENV        Set environment (development/production)
  LOG_ENABLE_FILE Force enable/disable file logging
  LOG_RETENTION_DAYS  Log retention period (default: 7 days)
  LOG_DIRECTORY   Custom log directory path

Examples:
  neura                           # Start server in development
  NODE_ENV=production neura       # Start server in production
  neura clearlogs                 # Clear all log files
`);
}

/**
 * Display version information
 */
export function showVersion(): void {
  const version = process.env.npm_package_version ?? '1.0.0';
  // eslint-disable-next-line no-console
  console.log(`Neura v${version}`);
}

/**
 * Handle CLI commands
 *
 * @param args - Command line arguments (process.argv.slice(2))
 * @returns true if command was handled and application should exit, false for normal startup
 */
export async function handleCliCommand(args: string[]): Promise<boolean> {
  const { command } = parseCommand(args);

  switch (command) {
    case 'clearlogs':
      return handleClearLogsCommand();

    case 'help':
      showHelp();
      return true;

    case 'version':
      showVersion();
      return true;

    case 'unknown':
    default:
      // Not a recognized command, proceed with normal startup
      return false;
  }
}

/**
 * Handle the clearlogs command
 */
async function handleClearLogsCommand(): Promise<boolean> {
  const exitCode = await executeClearLogs();
  process.exit(exitCode);
}
