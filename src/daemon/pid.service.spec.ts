/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * PID Service Tests
 *
 * Tests for PidService with mocked filesystem and process.
 */

import { readFile, unlink, writeFile } from 'fs/promises';
import { NeuraHomeService } from './neura-home.service';
import { PidFileContent, PidService } from './pid.service';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  unlink: jest.fn(),
  writeFile: jest.fn(),
  rename: jest.fn(),
}));

describe('PidService', () => {
  const mockPidFilePath = '/tmp/neura/test.pid';
  const mockHomeService = {
    getPidFilePath: jest.fn().mockReturnValue(mockPidFilePath),
  } as unknown as NeuraHomeService;

  let pidService: PidService;
  const originalKill = process.kill;

  beforeEach(() => {
    jest.clearAllMocks();
    pidService = new PidService(mockHomeService);
    // Reset process.kill mock
    process.kill = originalKill;
  });

  afterAll(() => {
    process.kill = originalKill;
  });

  describe('getPidFilePath', () => {
    it('should return the PID file path', () => {
      expect(pidService.getPidFilePath()).toBe(mockPidFilePath);
    });
  });

  describe('writePid', () => {
    it('should write PID file atomically', async () => {
      const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
      const mockRename = jest.fn().mockResolvedValue(undefined);
      jest.mocked(require('fs/promises')).rename = mockRename;

      await pidService.writePid();

      // Should write to temp file first
      expect(mockWriteFile).toHaveBeenCalledWith(
        `${mockPidFilePath}.tmp`,
        expect.stringContaining('"pid"'),
        { mode: 0o644 }
      );
    });

    it('should include correct PID content', async () => {
      const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
      const mockRename = jest.fn().mockResolvedValue(undefined);
      jest.mocked(require('fs/promises')).rename = mockRename;

      await pidService.writePid();

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;
      const parsed = JSON.parse(writtenContent) as PidFileContent;

      expect(parsed.pid).toBe(process.pid);
      expect(typeof parsed.startTime).toBe('number');
      expect(typeof parsed.version).toBe('string');
    });

    it('should throw error when write fails', async () => {
      const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
      mockWriteFile.mockRejectedValue(new Error('Permission denied'));

      await expect(pidService.writePid()).rejects.toThrow('Failed to write PID file');
    });

    it('should clean up temp file on failure', async () => {
      const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
      const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
      mockWriteFile.mockRejectedValue(new Error('Write failed'));

      try {
        await pidService.writePid();
      } catch {
        // Expected to throw
      }

      expect(mockUnlink).toHaveBeenCalledWith(`${mockPidFilePath}.tmp`);
    });
  });

  describe('readPid', () => {
    it('should return parsed PID content', async () => {
      const mockContent: PidFileContent = {
        pid: 12345,
        startTime: Date.now(),
        version: '1.0.0',
      };
      const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
      mockReadFile.mockResolvedValue(JSON.stringify(mockContent));

      const result = await pidService.readPid();

      expect(result).toEqual(mockContent);
    });

    it('should return null when file does not exist', async () => {
      const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
      const error = new Error('File not found') as Error & { code: string };
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      const result = await pidService.readPid();

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
      mockReadFile.mockResolvedValue('invalid json');

      const result = await pidService.readPid();

      expect(result).toBeNull();
    });

    it('should return null for missing required fields', async () => {
      const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
      mockReadFile.mockResolvedValue(JSON.stringify({ pid: 'not a number' }));

      const result = await pidService.readPid();

      expect(result).toBeNull();
    });

    it('should return null for corrupted file', async () => {
      const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
      mockReadFile.mockRejectedValue(new Error('Read error'));

      const result = await pidService.readPid();

      expect(result).toBeNull();
    });
  });

  describe('removePid', () => {
    it('should remove PID file', async () => {
      const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
      mockUnlink.mockResolvedValue(undefined);

      await pidService.removePid();

      expect(mockUnlink).toHaveBeenCalledWith(mockPidFilePath);
    });

    it('should not throw when file does not exist', async () => {
      const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
      const error = new Error('File not found') as Error & { code: string };
      error.code = 'ENOENT';
      mockUnlink.mockRejectedValue(error);

      await expect(pidService.removePid()).resolves.not.toThrow();
    });

    it('should throw on other errors', async () => {
      const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
      mockUnlink.mockRejectedValue(new Error('Permission denied'));

      await expect(pidService.removePid()).rejects.toThrow('Failed to remove PID file');
    });
  });

  describe('isProcessRunning', () => {
    it('should return true for running process', () => {
      process.kill = jest.fn().mockImplementation(() => {
        // Success - process exists
      });

      expect(pidService.isProcessRunning(12345)).toBe(true);
      expect(process.kill).toHaveBeenCalledWith(12345, 0);
    });

    it('should return false for non-existent process', () => {
      process.kill = jest.fn().mockImplementation(() => {
        throw new Error('ESRCH');
      });

      expect(pidService.isProcessRunning(99999)).toBe(false);
    });

    it('should return false when kill throws', () => {
      process.kill = jest.fn().mockImplementation(() => {
        throw new Error('EPERM');
      });

      expect(pidService.isProcessRunning(1)).toBe(false);
    });
  });

  describe('validateAndCleanup', () => {
    it('should return false when no PID file exists', async () => {
      const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
      const error = new Error('File not found') as Error & { code: string };
      error.code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);

      const result = await pidService.validateAndCleanup();

      expect(result).toBe(false);
    });

    it('should return true when process is running', async () => {
      const mockContent: PidFileContent = {
        pid: 12345,
        startTime: Date.now(),
        version: '1.0.0',
      };
      const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
      mockReadFile.mockResolvedValue(JSON.stringify(mockContent));

      process.kill = jest.fn().mockImplementation(() => {
        // Success
      });

      const result = await pidService.validateAndCleanup();

      expect(result).toBe(true);
    });

    it('should remove stale PID file and return false', async () => {
      const mockContent: PidFileContent = {
        pid: 99999,
        startTime: Date.now(),
        version: '1.0.0',
      };
      const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
      const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
      mockReadFile.mockResolvedValue(JSON.stringify(mockContent));
      mockUnlink.mockResolvedValue(undefined);

      process.kill = jest.fn().mockImplementation(() => {
        throw new Error('ESRCH');
      });

      const result = await pidService.validateAndCleanup();

      expect(result).toBe(false);
      expect(mockUnlink).toHaveBeenCalledWith(mockPidFilePath);
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockContent: PidFileContent = {
        pid: 99999,
        startTime: Date.now(),
        version: '1.0.0',
      };
      const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
      const mockUnlink = unlink as jest.MockedFunction<typeof unlink>;
      mockReadFile.mockResolvedValue(JSON.stringify(mockContent));
      mockUnlink.mockRejectedValue(new Error('Cleanup failed'));

      process.kill = jest.fn().mockImplementation(() => {
        throw new Error('ESRCH');
      });

      // Should not throw
      const result = await pidService.validateAndCleanup();

      expect(result).toBe(false);
    });
  });
});
