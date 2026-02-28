/**
 * CLI Module
 *
 * Command-line interface for Neura framework.
 * Provides commands for log management and operational tasks.
 */

export {
  handleCliCommand,
  parseCommand,
  showHelp,
  showVersion,
  type CliCommand,
} from './bootstrap';

export { ClearLogsCommand, executeClearLogs } from './commands/clearLogs';
