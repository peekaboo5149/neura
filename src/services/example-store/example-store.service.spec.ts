import { QueryIntent } from '@api/query/query-intent.enum';
import 'reflect-metadata';
import { ExampleStoreService } from './example-store.service';

// Mock OpenAI
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    embeddings: {
      create: mockCreate,
    },
  }));
});

describe('ExampleStoreService', () => {
  let service: ExampleStoreService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExampleStoreService({
      apiKey: 'test-api-key',
      model: 'text-embedding-3-small',
      similarityThreshold: 0.7,
      maxExamplesPerIntent: 3,
    });
  });

  describe('constructor', () => {
    it('should create service with default config', () => {
      const defaultService = new ExampleStoreService({ apiKey: 'test' });
      expect(defaultService).toBeDefined();
    });

    it('should create service with custom config', () => {
      expect(service).toBeDefined();
    });
  });

  describe('addExample', () => {
    it('should add example with embedding', async () => {
      mockCreate.mockResolvedValueOnce({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      });

      const result = await service.addExample('Check CPU usage', QueryIntent.INFORMATION_RETRIEVAL);

      expect(result.query).toBe('Check CPU usage');
      expect(result.intent).toBe(QueryIntent.INFORMATION_RETRIEVAL);
      expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle embedding generation failure', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.addExample('Check CPU usage', QueryIntent.INFORMATION_RETRIEVAL);

      expect(result.query).toBe('Check CPU usage');
      expect(result.embedding).toEqual([]);
    });
  });

  describe('addExamples', () => {
    it('should add multiple examples', async () => {
      mockCreate
        .mockResolvedValueOnce({ data: [{ embedding: [0.1, 0.2, 0.3] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0.4, 0.5, 0.6] }] });

      const results = await service.addExamples([
        { query: 'Check CPU', intent: QueryIntent.INFORMATION_RETRIEVAL },
        { query: 'Install npm', intent: QueryIntent.PACKAGE_MANAGEMENT },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].intent).toBe(QueryIntent.INFORMATION_RETRIEVAL);
      expect(results[1].intent).toBe(QueryIntent.PACKAGE_MANAGEMENT);
    });
  });

  describe('findSimilarExamples', () => {
    beforeEach(async () => {
      // Add some examples first
      mockCreate
        .mockResolvedValueOnce({ data: [{ embedding: [1.0, 0.0, 0.0] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0.9, 0.1, 0.0] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0.0, 1.0, 0.0] }] });

      await service.addExample('Check CPU usage', QueryIntent.INFORMATION_RETRIEVAL);
      await service.addExample('Check memory usage', QueryIntent.INFORMATION_RETRIEVAL);
      await service.addExample('Install package', QueryIntent.PACKAGE_MANAGEMENT);
    });

    it('should find similar examples above threshold', async () => {
      mockCreate.mockResolvedValueOnce({ data: [{ embedding: [0.95, 0.05, 0.0] }] });

      const results = await service.findSimilarExamples('Check disk usage');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.7);
    });

    it('should filter by target intent', async () => {
      mockCreate.mockResolvedValueOnce({ data: [{ embedding: [0.95, 0.05, 0.0] }] });

      const results = await service.findSimilarExamples('Check disk usage', {
        targetIntent: QueryIntent.INFORMATION_RETRIEVAL,
      });

      expect(results.every((r) => r.intent === QueryIntent.INFORMATION_RETRIEVAL)).toBe(true);
    });

    it('should respect topK limit', async () => {
      mockCreate.mockResolvedValueOnce({ data: [{ embedding: [0.95, 0.05, 0.0] }] });

      const results = await service.findSimilarExamples('Check disk usage', {
        topK: 1,
      });

      expect(results.length).toBeLessThanOrEqual(2); // 1 per intent
    });

    it('should return empty array when no matches above threshold', async () => {
      mockCreate.mockResolvedValueOnce({ data: [{ embedding: [0.0, 0.0, 1.0] }] });

      const results = await service.findSimilarExamples('Completely different query');

      expect(results).toEqual([]);
    });
  });

  describe('getICLExamples', () => {
    beforeEach(async () => {
      mockCreate
        .mockResolvedValueOnce({ data: [{ embedding: [1.0, 0.0, 0.0] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0.9, 0.1, 0.0] }] });

      await service.addExample('Check CPU usage', QueryIntent.INFORMATION_RETRIEVAL);
      await service.addExample('Check memory usage', QueryIntent.INFORMATION_RETRIEVAL);
    });

    it('should return ICL examples', async () => {
      mockCreate.mockResolvedValueOnce({ data: [{ embedding: [0.95, 0.05, 0.0] }] });

      const results = await service.getICLExamples('Check disk usage', 5);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('query');
      expect(results[0]).toHaveProperty('intent');
      expect(results[0]).toHaveProperty('explanation');
    });

    it('should respect maxExamples limit', async () => {
      mockCreate.mockResolvedValueOnce({ data: [{ embedding: [0.95, 0.05, 0.0] }] });

      const results = await service.getICLExamples('Check disk usage', 1);

      expect(results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getExamplesByIntent', () => {
    it('should return examples filtered by intent', async () => {
      mockCreate
        .mockResolvedValueOnce({ data: [{ embedding: [1.0, 0.0] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0.0, 1.0] }] });

      await service.addExample('Check CPU', QueryIntent.INFORMATION_RETRIEVAL);
      await service.addExample('Install npm', QueryIntent.PACKAGE_MANAGEMENT);

      const infoExamples = service.getExamplesByIntent(QueryIntent.INFORMATION_RETRIEVAL);

      expect(infoExamples.every((e) => e.intent === QueryIntent.INFORMATION_RETRIEVAL)).toBe(true);
    });

    it('should return empty array when no examples', () => {
      const results = service.getExamplesByIntent(QueryIntent.INFORMATION_RETRIEVAL);
      expect(results).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return store statistics', async () => {
      mockCreate.mockResolvedValueOnce({ data: [{ embedding: [0.1, 0.2] }] });
      await service.addExample('Check CPU', QueryIntent.INFORMATION_RETRIEVAL);

      const stats = service.getStats();

      expect(stats.totalExamples).toBe(1);
      expect(stats.examplesPerIntent[QueryIntent.INFORMATION_RETRIEVAL]).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all examples', async () => {
      mockCreate.mockResolvedValueOnce({ data: [{ embedding: [0.1, 0.2] }] });
      await service.addExample('Check CPU', QueryIntent.INFORMATION_RETRIEVAL);

      expect(service.getStats().totalExamples).toBe(1);

      service.clear();

      expect(service.getStats().totalExamples).toBe(0);
    });
  });

  describe('removeExample', () => {
    it('should remove example by id', async () => {
      mockCreate.mockResolvedValueOnce({ data: [{ embedding: [0.1, 0.2] }] });
      const example = await service.addExample('Check CPU', QueryIntent.INFORMATION_RETRIEVAL);

      const removed = service.removeExample(example.id);

      expect(removed).toBe(true);
      expect(service.getStats().totalExamples).toBe(0);
    });

    it('should return false for non-existent id', () => {
      const removed = service.removeExample('non-existent-id');
      expect(removed).toBe(false);
    });
  });
});
