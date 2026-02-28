/**
 * ExecutionModeDetector - Detects and applies execution mode for Neura
 *
 * Automatically determines whether Neura should run in production or development
 * mode based on how it was invoked.
 *
 * Detection priority:
 * 1. Respect explicit NODE_ENV if set
 * 2. Check NEURA_EXECUTABLE flag (set by bin/neura wrapper)
 * 3. Check if running from compiled dist (not ts-node)
 * 4. Default to development
 */
export class ExecutionModeDetector {
  /**
   * Detect the execution mode
   * @returns 'production' or 'development'
   */
  public static detect(): 'production' | 'development' {
    // Priority 1: Respect explicit NODE_ENV
    if (process.env.NODE_ENV) {
      return process.env.NODE_ENV === 'production' ? 'production' : 'development';
    }

    // Priority 2: Check if running as compiled executable
    if (process.env.NEURA_EXECUTABLE === 'true') {
      return 'production';
    }

    // Priority 3: Check if running from dist (not ts-node)
    const isCompiled = !process.argv[0]?.includes('ts-node') && __filename.includes('dist');
    if (isCompiled) {
      return 'production';
    }

    return 'development';
  }

  /**
   * Apply the detected execution mode to NODE_ENV
   * This should be called as early as possible in the bootstrap process
   */
  public static apply(): void {
    const mode = this.detect();

    (process.env as Record<string, string | undefined>).NODE_ENV = mode;
  }

  /**
   * Check if currently running in production mode
   */
  public static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Check if currently running in development mode
   */
  public static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
}
