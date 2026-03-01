/* eslint-disable no-undef */

/**
 * Command Executor Tool
 *
 * Tool for executing Unix commands safely.
 * Provides a structured interface for command execution with proper error handling.
 */

import { spawn } from 'child_process';
import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';
import { CommandExecutionResult } from './command-execution.dto';

export interface CommandExecutorOptions {
  cwd?: string;
  timeout?: number;
  env?: NodeJS.ProcessEnv;
}

export const CommandExecutorConfigToken = Symbol('CommandExecutorConfig');

@injectable()
export class CommandExecutorTool {
  private defaultOptions: CommandExecutorOptions;

  constructor(
    @inject(CommandExecutorConfigToken)
    options: CommandExecutorOptions = {}
  ) {
    this.defaultOptions = {
      timeout: 30000, // 30 seconds default
      ...options,
    };
  }

  /**
   * Execute a shell command
   *
   * @param command - The command string to execute
   * @param options - Execution options
   * @returns Promise<CommandExecutionResult>
   */
  async execute(
    command: string,
    options: CommandExecutorOptions = {}
  ): Promise<CommandExecutionResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    return new Promise((resolve) => {
      const [cmd, ...args] = this.parseCommand(command);

      const childProcess = spawn(cmd, args, {
        cwd: mergedOptions.cwd,
        env: { ...process.env, ...mergedOptions.env },
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout | null = null;

      // Handle timeout
      if (mergedOptions.timeout && mergedOptions.timeout > 0) {
        timeoutId = setTimeout(() => {
          childProcess.kill('SIGTERM');
          resolve(
            CommandExecutionResult.failure(-1, `Command timed out after ${mergedOptions.timeout}ms`)
          );
        }, mergedOptions.timeout);
      }

      // Collect stdout
      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      // Collect stderr
      childProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // Handle process completion
      childProcess.on('close', (code: number | null) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const exitCode = code ?? -1;

        if (exitCode === 0) {
          resolve(CommandExecutionResult.success(stdout.trim()));
        } else {
          resolve(
            CommandExecutionResult.failure(
              exitCode,
              stderr.trim() || stdout.trim() || 'Command failed with no output'
            )
          );
        }
      });

      // Handle process errors (spawn failures)
      childProcess.on('error', (error: Error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(CommandExecutionResult.failure(-1, error.message));
      });
    });
  }

  /**
   * Parse a command string into command and arguments
   *
   * @param command - Raw command string
   * @returns Array of [command, ...args]
   */
  private parseCommand(command: string): string[] {
    // Simple parsing - for complex cases, consider using a proper shell parser
    const trimmed = command.trim();
    if (!trimmed) {
      return [''];
    }
    return [trimmed];
  }

  /**
   * Execute command with streaming output
   *
   * @param command - The command string to execute
   * @param onData - Callback for stdout data
   * @param onError - Callback for stderr data
   * @param options - Execution options
   * @returns Promise<CommandExecutionResult>
   */
  async executeStreaming(
    command: string,
    onData: (data: string) => void,
    onError: (data: string) => void,
    options: CommandExecutorOptions = {}
  ): Promise<CommandExecutionResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    return new Promise((resolve) => {
      const [cmd, ...args] = this.parseCommand(command);

      const childProcess = spawn(cmd, args, {
        cwd: mergedOptions.cwd,
        env: { ...process.env, ...mergedOptions.env },
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout | null = null;

      // Handle timeout
      if (mergedOptions.timeout && mergedOptions.timeout > 0) {
        timeoutId = setTimeout(() => {
          childProcess.kill('SIGTERM');
          resolve(
            CommandExecutionResult.failure(-1, `Command timed out after ${mergedOptions.timeout}ms`)
          );
        }, mergedOptions.timeout);
      }

      // Stream stdout
      childProcess.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        onData(chunk);
      });

      // Stream stderr
      childProcess.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        onError(chunk);
      });

      // Handle process completion
      childProcess.on('close', (code: number | null) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const exitCode = code ?? -1;

        if (exitCode === 0) {
          resolve(CommandExecutionResult.success(stdout.trim()));
        } else {
          resolve(
            CommandExecutionResult.failure(
              exitCode,
              stderr.trim() || stdout.trim() || 'Command failed with no output'
            )
          );
        }
      });

      // Handle process errors
      childProcess.on('error', (error: Error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(CommandExecutionResult.failure(-1, error.message));
      });
    });
  }
}
