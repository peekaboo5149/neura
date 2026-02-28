import {
  AsyncContextManager,
  getCurrentTraceContext,
  runWithTraceContext,
  runWithTraceContextAsync,
} from './AsyncContextManager';
import type { TraceContext } from './TraceContext';

describe('AsyncContextManager', () => {
  let manager: AsyncContextManager;

  beforeEach(() => {
    manager = AsyncContextManager.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AsyncContextManager.getInstance();
      const instance2 = AsyncContextManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('runWithContext', () => {
    it('should set context for synchronous function', () => {
      const context: TraceContext = {
        traceId: 'abc123',
        spanId: 'def456',
        correlationId: 'ghi789',
      };

      const result = manager.runWithContext(context, () => {
        return manager.getContext();
      });

      expect(result).toEqual(context);
    });

    it('should clear context after function completes', () => {
      const context: TraceContext = {
        traceId: 'abc123',
        spanId: 'def456',
      };

      manager.runWithContext(context, () => {
        expect(manager.getContext()).toEqual(context);
      });

      expect(manager.getContext()).toBeUndefined();
    });

    it('should return function result', () => {
      const context: TraceContext = {
        traceId: 'abc123',
        spanId: 'def456',
      };

      const result = manager.runWithContext(context, () => {
        return 'test result';
      });

      expect(result).toBe('test result');
    });
  });

  describe('runWithContextAsync', () => {
    it('should set context for async function', async () => {
      const context: TraceContext = {
        traceId: 'abc123',
        spanId: 'def456',
      };

      const result = await manager.runWithContextAsync(context, async () => {
        await Promise.resolve();
        return manager.getContext();
      });

      expect(result).toEqual(context);
    });

    it('should maintain context through async operations', async () => {
      const context: TraceContext = {
        traceId: 'abc123',
        spanId: 'def456',
      };

      await manager.runWithContextAsync(context, async () => {
        expect(manager.getContext()).toEqual(context);
        await Promise.resolve();
        expect(manager.getContext()).toEqual(context);
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(manager.getContext()).toEqual(context);
      });
    });

    it('should clear context after async function completes', async () => {
      const context: TraceContext = {
        traceId: 'abc123',
        spanId: 'def456',
      };

      await manager.runWithContextAsync(context, () => {
        expect(manager.getContext()).toEqual(context);
        return Promise.resolve();
      });

      expect(manager.getContext()).toBeUndefined();
    });
  });

  describe('getContext', () => {
    it('should return undefined when no context is set', () => {
      expect(manager.getContext()).toBeUndefined();
    });

    it('should return context when set', () => {
      const context: TraceContext = {
        traceId: 'abc123',
        spanId: 'def456',
      };

      manager.runWithContext(context, () => {
        expect(manager.getContext()).toEqual(context);
      });
    });
  });

  describe('hasContext', () => {
    it('should return false when no context is set', () => {
      expect(manager.hasContext()).toBe(false);
    });

    it('should return true when context is set', () => {
      const context: TraceContext = {
        traceId: 'abc123',
        spanId: 'def456',
      };

      manager.runWithContext(context, () => {
        expect(manager.hasContext()).toBe(true);
      });
    });
  });

  describe('convenience functions', () => {
    it('getCurrentTraceContext should return context', () => {
      const context: TraceContext = {
        traceId: 'abc123',
        spanId: 'def456',
      };

      runWithTraceContext(context, () => {
        expect(getCurrentTraceContext()).toEqual(context);
      });
    });

    it('runWithTraceContext should work as alias', () => {
      const context: TraceContext = {
        traceId: 'abc123',
        spanId: 'def456',
      };

      const result = runWithTraceContext(context, () => {
        return getCurrentTraceContext();
      });

      expect(result).toEqual(context);
    });

    it('runWithTraceContextAsync should work as alias', async () => {
      const context: TraceContext = {
        traceId: 'abc123',
        spanId: 'def456',
      };

      const result = await runWithTraceContextAsync(context, async () => {
        await Promise.resolve();
        return getCurrentTraceContext();
      });

      expect(result).toEqual(context);
    });
  });

  describe('nested contexts', () => {
    it('should handle nested context calls', () => {
      const outerContext: TraceContext = {
        traceId: 'outer123',
        spanId: 'outer456',
      };

      const innerContext: TraceContext = {
        traceId: 'inner123',
        spanId: 'inner456',
      };

      manager.runWithContext(outerContext, () => {
        expect(manager.getContext()).toEqual(outerContext);

        manager.runWithContext(innerContext, () => {
          expect(manager.getContext()).toEqual(innerContext);
        });

        expect(manager.getContext()).toEqual(outerContext);
      });

      expect(manager.getContext()).toBeUndefined();
    });
  });
});
