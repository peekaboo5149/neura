import { spawn, type ChildProcess } from 'child_process';

/**
 * ProcessService - Manages daemon process spawning and detection
 *
 * Responsibilities:
 * - Spawn detached background processes
 * - Detect if current process is a daemon
 * - Handle cross-platform process management
 */
export class ProcessService {
  /**
   * Spawn a detached daemon process
   * The child process will run independently of the parent
   */
  public spawnDaemon(): ChildProcess {
    // Get the current executable and arguments
    const nodePath = process.argv[0];
    const scriptPath = process.argv[1];
    const args = process.argv.slice(2);

    // Filter out any daemon-related arguments to prevent confusion
    const filteredArgs = args.filter(
      (arg) => arg !== 'start' && arg !== 'stop' && arg !== 'status'
    );

    const child = spawn(nodePath, [scriptPath ?? '', ...filteredArgs], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        NEURA_DAEMON: 'true',
        NODE_ENV: 'production',
      },
    });

    return child;
  }

  /**
   * Check if the current process is running as a daemon
   */
  public static isDaemonProcess(): boolean {
    return process.env.NEURA_DAEMON === 'true';
  }

  /**
   * Check if the current process is running as a daemon (instance method)
   */
  public isDaemonProcess(): boolean {
    return ProcessService.isDaemonProcess();
  }

  /**
   * Send a signal to a process
   * @param pid - Process ID
   * @param signal - Signal to send (default: SIGTERM)
   * @returns true if signal was sent successfully
   */
  public sendSignal(pid: number, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    try {
      process.kill(pid, signal);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for a process to terminate
   * @param pid - Process ID to wait for
   * @param timeout - Maximum time to wait in milliseconds
   * @returns true if process terminated, false if timeout
   */
  public async waitForTermination(pid: number, timeout: number): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 100; // Check every 100ms

    return new Promise((resolve) => {
      const check = (): void => {
        // Check if process is still running
        try {
          process.kill(pid, 0);
          // Process is still running
        } catch {
          // Process has terminated
          resolve(true);
          return;
        }

        // Check timeout
        if (Date.now() - startTime >= timeout) {
          resolve(false);
          return;
        }

        // Schedule next check
        globalThis.setTimeout(check, checkInterval);
      };

      check();
    });
  }

  /**
   * Force kill a process
   * @param pid - Process ID
   * @returns true if kill was successful
   */
  public forceKill(pid: number): boolean {
    try {
      process.kill(pid, 'SIGKILL');
      return true;
    } catch {
      return false;
    }
  }
}
