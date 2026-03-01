import { QueryIntent } from '@api/query/query-intent.enum';
import 'reflect-metadata';
import { IntentDescriptionService } from './intent-description.service';

// Mock OpenAI
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

describe('IntentDescriptionService', () => {
  let service: IntentDescriptionService;
  const mockConfig = {
    apiKey: 'test-api-key',
    model: 'gpt-4',
    cacheEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new IntentDescriptionService(mockConfig);
  });

  describe('constructor', () => {
    it('should create service with default model', () => {
      const serviceWithDefaults = new IntentDescriptionService({
        apiKey: 'test-key',
      });
      expect(serviceWithDefaults).toBeDefined();
    });

    it('should create service with custom config', () => {
      expect(service).toBeDefined();
    });
  });

  describe('generateDescription', () => {
    it('should return cached description if available', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                shortDescription: 'Test short',
                detailedDescription: 'Test detailed',
                typicalPatterns: ['pattern1', 'pattern2'],
                commonVerbs: ['verb1', 'verb2'],
                scopeBoundaries: ['boundary1'],
                exampleScenarios: ['scenario1'],
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      // First call - should call LLM
      const result1 = await service.generateDescription(QueryIntent.FILE_READ);
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await service.generateDescription(QueryIntent.FILE_READ);
      expect(mockCreate).toHaveBeenCalledTimes(1); // No additional calls
      expect(result1).toEqual(result2);
    });

    it('should generate description from LLM', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                shortDescription: 'Read files',
                detailedDescription: 'Read file contents without modification',
                typicalPatterns: ['Read {filename}', 'Show contents of {file}'],
                commonVerbs: ['read', 'show', 'display'],
                scopeBoundaries: ['Read-only operations', 'No modifications'],
                exampleScenarios: ['Reading config files', 'Viewing logs'],
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValueOnce(mockResponse);

      const result = await service.generateDescription(QueryIntent.FILE_READ);

      expect(result.intent).toBe(QueryIntent.FILE_READ);
      expect(result.shortDescription).toBe('Read files');
      expect(result.typicalPatterns).toHaveLength(2);
      expect(result.commonVerbs).toContain('read');
    });

    it('should return fallback description on LLM error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.generateDescription(QueryIntent.FILE_READ);

      expect(result.intent).toBe(QueryIntent.FILE_READ);
      expect(result.shortDescription).toBeDefined();
      expect(result.detailedDescription).toBeDefined();
    });

    it('should return fallback on empty response', async () => {
      mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: null } }] });

      const result = await service.generateDescription(QueryIntent.FILE_READ);

      expect(result.intent).toBe(QueryIntent.FILE_READ);
      expect(result.shortDescription).toBeDefined();
    });
  });

  describe('generateAllDescriptions', () => {
    it('should generate descriptions for all intents', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                shortDescription: 'Test',
                detailedDescription: 'Test detailed',
                typicalPatterns: ['pattern1'],
                commonVerbs: ['verb1'],
                scopeBoundaries: ['boundary1'],
                exampleScenarios: ['scenario1'],
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const result = await service.generateAllDescriptions();

      expect(result.size).toBeGreaterThan(0);
      expect(result.has(QueryIntent.FILE_READ)).toBe(true);
      expect(result.has(QueryIntent.SYSTEM_COMMAND)).toBe(true);
    });
  });

  describe('buildEnhancedSystemPrompt', () => {
    it('should build enhanced prompt with descriptions', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                shortDescription: 'Test',
                detailedDescription: 'Test detailed',
                typicalPatterns: ['pattern1'],
                commonVerbs: ['verb1'],
                scopeBoundaries: ['boundary1'],
                exampleScenarios: ['scenario1'],
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const prompt = await service.buildEnhancedSystemPrompt();

      expect(prompt).toContain('=== INTENT DEFINITIONS ===');
      expect(prompt).toContain('=== CLASSIFICATION RULES ===');
      expect(prompt).toContain(QueryIntent.FILE_READ);
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                shortDescription: 'Test',
                detailedDescription: 'Test detailed',
                typicalPatterns: ['pattern1'],
                commonVerbs: ['verb1'],
                scopeBoundaries: ['boundary1'],
                exampleScenarios: ['scenario1'],
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      await service.generateDescription(QueryIntent.FILE_READ);
      expect(service.getCacheStats().size).toBe(1);

      service.clearCache();
      expect(service.getCacheStats().size).toBe(0);
    });

    it('should return cache stats', () => {
      const stats = service.getCacheStats();
      expect(stats.enabled).toBe(true);
      expect(stats.size).toBe(0);
    });
  });

  describe('cache disabled', () => {
    it('should not cache when disabled', async () => {
      const serviceNoCache = new IntentDescriptionService({
        apiKey: 'test-key',
        cacheEnabled: false,
      });

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                shortDescription: 'Test',
                detailedDescription: 'Test detailed',
                typicalPatterns: ['pattern1'],
                commonVerbs: ['verb1'],
                scopeBoundaries: ['boundary1'],
                exampleScenarios: ['scenario1'],
              }),
            },
          },
        ],
      };
      mockCreate.mockResolvedValue(mockResponse);

      await serviceNoCache.generateDescription(QueryIntent.FILE_READ);
      await serviceNoCache.generateDescription(QueryIntent.FILE_READ);

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(serviceNoCache.getCacheStats().enabled).toBe(false);
    });
  });
});
