/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

/**
 * Classify Intent Node Tests
 *
 * Tests for the classify.node.ts with mocked OpenAI SDK.
 */

import { QueryIntent } from '@api/query/query-intent.enum';
import { GraphState } from '../../core/types';
import { createClassifyIntentNode } from './classify.node';

// Mock OpenAI SDK
const mockCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

describe('ClassifyIntentNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createNode = () =>
    createClassifyIntentNode({
      apiKey: 'test-api-key',
      model: 'gpt-4',
      temperature: 0.1,
    });

  const createMockState = (input: string): GraphState => ({
    input,
    inputType: 'query',
    results: {},
    metadata: {
      startTime: new Date().toISOString(),
      nodeExecutionLog: [],
    },
    context: {},
  });

  describe('successful classification', () => {
    it('should classify FILE_READ intent', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: QueryIntent.FILE_READ,
                reason: 'Query involves reading a file',
              }),
            },
          },
        ],
      });

      const node = createNode();
      const state = createMockState('Read package.json');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.FILE_READ);
      expect(result.results?.intent?.reason).toBe('Query involves reading a file');
      expect(result.metadata?.nodeExecutionLog).toContain('classifyIntent');
    });

    it('should classify PACKAGE_MANAGEMENT intent', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: QueryIntent.PACKAGE_MANAGEMENT,
                reason: 'Installing a package',
              }),
            },
          },
        ],
      });

      const node = createNode();
      const state = createMockState('Install lodash');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.PACKAGE_MANAGEMENT);
    });

    it('should classify UNKNOWN intent', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: QueryIntent.UNKNOWN,
                reason: 'Query is outside scope',
              }),
            },
          },
        ],
      });

      const node = createNode();
      const state = createMockState('Tell me a joke');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
    });

    it('should use default reason if not provided', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: QueryIntent.FILE_READ,
              }),
            },
          },
        ],
      });

      const node = createNode();
      const state = createMockState('Read file');
      const result = await node(state);

      expect(result.results?.intent?.reason).toBe('No reason provided');
    });
  });

  describe('API error handling', () => {
    it('should handle API error response', async () => {
      const error = new Error('401 Unauthorized');
      error.name = 'APIError';
      mockCreate.mockRejectedValueOnce(error);

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.results?.intent?.reason).toContain('401 Unauthorized');
    });

    it('should handle empty response content', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [],
      });

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.results?.intent?.reason).toBe('Empty response from API');
    });

    it('should handle missing message content', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {},
          },
        ],
      });

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
    });
  });

  describe('JSON parsing errors', () => {
    it('should handle invalid JSON in response', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'not valid json',
            },
          },
        ],
      });

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.results?.intent?.reason).toContain('Classification failed');
    });

    it('should handle invalid intent value', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'INVALID_INTENT',
                reason: 'Some reason',
              }),
            },
          },
        ],
      });

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.results?.intent?.reason).toContain('Invalid intent returned');
    });
  });

  describe('network errors', () => {
    it('should handle SDK throwing error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Network error'));

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.results?.intent?.reason).toContain('Network error');
    });

    it('should handle non-Error throw', async () => {
      mockCreate.mockRejectedValueOnce('String error');

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.results?.intent?.reason).toContain('String error');
    });
  });

  describe('request configuration', () => {
    it('should call OpenAI with correct parameters', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: QueryIntent.FILE_READ,
                reason: 'Test',
              }),
            },
          },
        ],
      });

      const node = createNode();
      const state = createMockState('Read file');
      await node(state);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          temperature: 0.1,
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Read file'),
            }),
          ]),
        })
      );
    });
  });

  describe('state preservation', () => {
    it('should preserve existing results', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: QueryIntent.FILE_READ,
                reason: 'Test',
              }),
            },
          },
        ],
      });

      const node = createNode();
      const state = createMockState('Read file');
      state.results = {
        security: {
          classification: expect.anything(),
          canExecute: true,
        },
      };
      const result = await node(state);

      expect(result.results?.security).toBeDefined();
      expect(result.results?.intent).toBeDefined();
    });
  });
});
