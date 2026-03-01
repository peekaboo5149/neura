/**
 * Command Execution DTO
 *
 * Data transfer object for command execution results.
 */

export class CommandExecutionResult {
  message: string | undefined;
  error: string | undefined;
  exitCode: number;

  constructor(exitCode: number, message?: string, error?: string) {
    this.exitCode = exitCode;
    this.message = message;
    this.error = error;
  }

  /**
   * Check if command executed successfully
   */
  isSuccess(): boolean {
    return this.exitCode === 0;
  }

  /**
   * Create a successful result
   */
  static success(message: string): CommandExecutionResult {
    return new CommandExecutionResult(0, message, undefined);
  }

  /**
   * Create an error result
   */
  static failure(exitCode: number, error: string): CommandExecutionResult {
    return new CommandExecutionResult(exitCode, undefined, error);
  }
}
