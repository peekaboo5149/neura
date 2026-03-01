/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/explicit-function-return-type */

/**
 * Classify Intent Node Tests
 *
 * Tests for the classify.node.ts with mocked fetch API.
 */

import { QueryIntent } from '@api/query/query-intent.enum';
import { GraphState } from '../../core/types';
import { createClassifyIntentNode } from './classify.node';

describe('ClassifyIntentNode', () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

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

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('successful classification', () => {
    it('should classify FILE_READ intent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
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
        }),
      });

      const node = createNode();
      const state = createMockState('Read package.json');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.FILE_READ);
      expect(result.results?.intent?.reason).toBe('Query involves reading a file');
      expect(result.metadata?.nodeExecutionLog).toContain('classifyIntent');
    });

    it('should classify PACKAGE_MANAGEMENT intent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
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
        }),
      });

      const node = createNode();
      const state = createMockState('Install lodash');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.PACKAGE_MANAGEMENT);
    });

    it('should classify UNKNOWN intent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
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
        }),
      });

      const node = createNode();
      const state = createMockState('Tell me a joke');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
    });

    it('should use default reason if not provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  intent: QueryIntent.FILE_READ,
                }),
              },
            },
          ],
        }),
      });

      const node = createNode();
      const state = createMockState('Read file');
      const result = await node(state);

      expect(result.results?.intent?.reason).toBe('No reason provided');
    });
  });

  describe('API error handling', () => {
    it('should handle non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.results?.intent?.reason).toContain('API error: 401');
    });

    it('should handle empty response content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [],
        }),
      });

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.results?.intent?.reason).toBe('Empty response from API');
    });

    it('should handle missing message content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {},
            },
          ],
        }),
      });

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
    });
  });

  describe('JSON parsing errors', () => {
    it('should handle invalid JSON in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'not valid json',
              },
            },
          ],
        }),
      });

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.results?.intent?.reason).toContain('Classification failed');
    });

    it('should handle invalid intent value', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
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
        }),
      });

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.results?.intent?.reason).toContain('Invalid intent returned');
    });
  });

  describe('network errors', () => {
    it('should handle fetch throwing error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.results?.intent?.reason).toContain('Network error');
    });

    it('should handle non-Error throw', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      const node = createNode();
      const state = createMockState('Some query');
      const result = await node(state);

      expect(result.results?.intent?.intent).toBe(QueryIntent.UNKNOWN);
      expect(result.results?.intent?.reason).toContain('String error');
    });
  });

  describe('request configuration', () => {
    it('should call fetch with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
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
        }),
      });

      const node = createNode();
      const state = createMockState('Read file');
      await node(state);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('gpt-4'),
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('gpt-4');
      expect(callBody.temperature).toBe(0.1);
      expect(callBody.messages).toHaveLength(2);
      expect(callBody.messages[1].content).toContain('Read file');
    });
  });

  describe('state preservation', () => {
    it('should preserve existing results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
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
        }),
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
