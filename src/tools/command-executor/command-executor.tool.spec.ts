import 'reflect-metadata';

/**
 * Command Executor Tool Tests
 *
 * Tests for the CommandExecutorTool.
 */

import { CommandExecutionResult } from './command-execution.dto';
import { CommandExecutorTool } from './command-executor.tool';

describe('CommandExecutorTool', () => {
  let executor: CommandExecutorTool;

  beforeEach(() => {
    executor = new CommandExecutorTool({});
  });

  describe('execute', () => {
    it('should execute a simple command successfully', async () => {
      const result = await executor.execute('echo "hello world"');

      expect(result.isSuccess()).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.message).toBe('hello world');
      expect(result.error).toBeUndefined();
    });

    it('should capture command output', async () => {
      const result = await executor.execute('echo "test output"');

      expect(result.message).toBe('test output');
    });

    it('should handle command with arguments', async () => {
      const result = await executor.execute('echo arg1 arg2 arg3');

      expect(result.isSuccess()).toBe(true);
      expect(result.message).toBe('arg1 arg2 arg3');
    });

    it('should handle failed commands', async () => {
      const result = await executor.execute('exit 1');

      expect(result.isSuccess()).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should capture stderr on failure', async () => {
      const result = await executor.execute('echo "error message" >&2 && exit 1');

      expect(result.isSuccess()).toBe(false);
      expect(result.error).toContain('error message');
    });

    it('should respect custom timeout', async () => {
      const result = await executor.execute('sleep 5', { timeout: 100 });

      expect(result.isSuccess()).toBe(false);
      expect(result.exitCode).toBe(-1);
      expect(result.error).toContain('timed out');
    });

    it('should execute within timeout successfully', async () => {
      const result = await executor.execute('echo "quick"', { timeout: 5000 });

      expect(result.isSuccess()).toBe(true);
    });

    it('should handle empty command output', async () => {
      const result = await executor.execute('printf ""');

      expect(result.isSuccess()).toBe(true);
      expect(result.message).toBe('');
    });

    it('should handle multiline output', async () => {
      const result = await executor.execute('printf "line1\nline2\nline3"');

      expect(result.isSuccess()).toBe(true);
      expect(result.message).toBe('line1\nline2\nline3');
    });

    it('should handle commands with special characters', async () => {
      const result = await executor.execute('echo "special chars: !@#$%^&*()"');

      expect(result.isSuccess()).toBe(true);
      expect(result.message).toContain('special chars');
    });

    it('should execute command in specified cwd', async () => {
      const result = await executor.execute('pwd', { cwd: '/tmp' });

      expect(result.isSuccess()).toBe(true);
      expect(result.message).toMatch(/\/tmp$/);
    });

    it('should handle non-existent command', async () => {
      const result = await executor.execute('nonexistentcommand12345');

      expect(result.isSuccess()).toBe(false);
      expect(result.exitCode).not.toBe(0);
    });

    it('should handle command with environment variables', async () => {
      const result = await executor.execute('echo $TEST_VAR', {
        env: { TEST_VAR: 'test_value' },
      });

      expect(result.isSuccess()).toBe(true);
      expect(result.message).toBe('test_value');
    });

    it('should merge environment variables with process.env', async () => {
      const result = await executor.execute('echo $PATH');

      expect(result.isSuccess()).toBe(true);
      expect(result.message).toContain('/');
    });
  });

  describe('executeStreaming', () => {
    it('should stream stdout data', async () => {
      const chunks: string[] = [];
      const onData = (data: string): void => {
        chunks.push(data);
      };
      const onError = (): void => {
        // no-op
      };

      const result = await executor.executeStreaming('echo "streaming test"', onData, onError);

      expect(result.isSuccess()).toBe(true);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toContain('streaming test');
    });

    it('should stream stderr data', async () => {
      const errorChunks: string[] = [];
      const onData = (): void => {
        // no-op
      };
      const onError = (data: string): void => {
        errorChunks.push(data);
      };

      const result = await executor.executeStreaming('echo "error" >&2 && exit 1', onData, onError);

      expect(result.isSuccess()).toBe(false);
      expect(errorChunks.length).toBeGreaterThan(0);
      expect(errorChunks.join('')).toContain('error');
    });

    it('should complete with success for valid command', async () => {
      const onData = (): void => {
        // no-op
      };
      const onError = (): void => {
        // no-op
      };

      const result = await executor.executeStreaming('echo "success"', onData, onError);

      expect(result.isSuccess()).toBe(true);
      expect(result.message).toBe('success');
    });

    it('should handle timeout in streaming mode', async () => {
      const onData = (): void => {
        // no-op
      };
      const onError = (): void => {
        // no-op
      };

      const result = await executor.executeStreaming('sleep 5', onData, onError, { timeout: 100 });

      expect(result.isSuccess()).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  describe('CommandExecutionResult', () => {
    it('should create success result', () => {
      const result = CommandExecutionResult.success('output');

      expect(result.isSuccess()).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.message).toBe('output');
      expect(result.error).toBeUndefined();
    });

    it('should create failure result', () => {
      const result = CommandExecutionResult.failure(1, 'error message');

      expect(result.isSuccess()).toBe(false);
      expect(result.exitCode).toBe(1);
      expect(result.error).toBe('error message');
      expect(result.message).toBeUndefined();
    });

    it('should handle exit code 0 as success', () => {
      const result = new CommandExecutionResult(0, 'output', undefined);

      expect(result.isSuccess()).toBe(true);
    });

    it('should handle non-zero exit code as failure', () => {
      const result = new CommandExecutionResult(127, undefined, 'not found');

      expect(result.isSuccess()).toBe(false);
    });

    it('should handle negative exit code as failure', () => {
      const result = new CommandExecutionResult(-1, undefined, 'killed');

      expect(result.isSuccess()).toBe(false);
    });

    it('should allow undefined message and error', () => {
      const result = new CommandExecutionResult(0, undefined, undefined);

      expect(result.message).toBeUndefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe('default options', () => {
    it('should use default timeout of 30 seconds', async () => {
      const customExecutor = new CommandExecutorTool({});
      const result = await customExecutor.execute('echo "quick"');

      expect(result.isSuccess()).toBe(true);
    });

    it('should allow overriding default options', async () => {
      const customExecutor = new CommandExecutorTool({ timeout: 100 });
      const result = await customExecutor.execute('sleep 5');

      expect(result.isSuccess()).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  describe('edge cases', () => {
    it('should handle very long output', async () => {
      const result = await executor.execute('yes "test" | head -1000');

      expect(result.isSuccess()).toBe(true);
      expect(result.message?.split('\n').length).toBe(1000);
    });

    it('should handle command with pipes', async () => {
      const result = await executor.execute('echo "hello" | tr "a-z" "A-Z"');

      expect(result.isSuccess()).toBe(true);
      expect(result.message).toBe('HELLO');
    });

    it('should handle command with redirects', async () => {
      const result = await executor.execute('echo "redirect test" | cat');

      expect(result.isSuccess()).toBe(true);
      expect(result.message).toBe('redirect test');
    });
  });
});
