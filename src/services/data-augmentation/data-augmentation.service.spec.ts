import { QueryIntent } from '@api/query/query-intent.enum';
import 'reflect-metadata';
import {
    AugmentationTechnique,
    DataAugmentationService
} from './data-augmentation.service';

describe('DataAugmentationService', () => {
  let service: DataAugmentationService;

  beforeEach(() => {
    service = new DataAugmentationService({
      augmentationRatio: 0.3,
      enableKeywordRemoval: true,
      enableKeywordReplacement: true,
      enablePatternMixing: true,
      enableScopeViolation: true,
    });
  });

  describe('constructor', () => {
    it('should create service with default config', () => {
      const defaultService = new DataAugmentationService();
      expect(defaultService).toBeDefined();
    });

    it('should create service with custom config', () => {
      expect(service).toBeDefined();
    });
  });

  describe('augmentExamples', () => {
    it('should augment examples with multiple techniques', () => {
      const examples = [
        { query: 'Check CPU usage', intent: QueryIntent.INFORMATION_RETRIEVAL },
        { query: 'Install npm package', intent: QueryIntent.PACKAGE_MANAGEMENT },
        { query: 'Read the file', intent: QueryIntent.FILE_READ },
      ];

      const augmented = service.augmentExamples(examples);

      expect(augmented.length).toBeGreaterThan(0);
      expect(augmented.every((ex) => ex.shouldBeOOS)).toBe(true);
    });

    it('should apply keyword removal', () => {
      const examples = [{ query: 'Check file status', intent: QueryIntent.INFORMATION_RETRIEVAL }];

      const augmented = service.augmentExamples(examples);

      const removalExamples = augmented.filter(
        (ex) => ex.technique === AugmentationTechnique.KEYWORD_REMOVAL
      );

      if (removalExamples.length > 0) {
        expect(removalExamples[0].augmentedQuery).not.toBe(examples[0].query);
        expect(removalExamples[0].originalQuery).toBe(examples[0].query);
      }
    });

    it('should apply keyword replacement', () => {
      const examples = [{ query: 'Install npm package', intent: QueryIntent.PACKAGE_MANAGEMENT }];

      const augmented = service.augmentExamples(examples);

      const replacementExamples = augmented.filter(
        (ex) => ex.technique === AugmentationTechnique.KEYWORD_REPLACEMENT
      );

      if (replacementExamples.length > 0) {
        expect(replacementExamples[0].augmentedQuery).not.toBe(examples[0].query);
        expect(replacementExamples[0].metadata).toHaveProperty('replaced');
      }
    });

    it('should apply pattern mixing', () => {
      const examples = [
        { query: 'Check CPU', intent: QueryIntent.INFORMATION_RETRIEVAL },
        { query: 'Install npm', intent: QueryIntent.PACKAGE_MANAGEMENT },
      ];

      const augmented = service.augmentExamples(examples);

      const mixedExamples = augmented.filter(
        (ex) => ex.technique === AugmentationTechnique.PATTERN_MIXING
      );

      if (mixedExamples.length > 0) {
        expect(mixedExamples[0].metadata).toHaveProperty('mixedWith');
        expect(mixedExamples[0].metadata).toHaveProperty('originalIntent');
      }
    });

    it('should apply scope violations', () => {
      const examples = [{ query: 'Check CPU', intent: QueryIntent.INFORMATION_RETRIEVAL }];

      const augmented = service.augmentExamples(examples);

      const violationExamples = augmented.filter(
        (ex) => ex.technique === AugmentationTechnique.SCOPE_VIOLATION
      );

      if (violationExamples.length > 0) {
        expect(violationExamples[0].augmentedQuery.length).toBeGreaterThan(
          examples[0].query.length
        );
      }
    });
  });

  describe('generateNegativeExamples', () => {
    it('should generate general knowledge questions', () => {
      const negatives = service.generateNegativeExamples(10);

      const generalKnowledge = negatives.filter(
        (ex) => ex.technique === AugmentationTechnique.GENERAL_KNOWLEDGE
      );

      expect(generalKnowledge.length).toBeGreaterThan(0);
      expect(generalKnowledge.every((ex) => ex.shouldBeOOS)).toBe(true);
    });

    it('should generate personal questions', () => {
      const negatives = service.generateNegativeExamples(10);

      const personal = negatives.filter(
        (ex) => ex.technique === AugmentationTechnique.PERSONAL_QUESTION
      );

      expect(personal.length).toBeGreaterThan(0);
      expect(personal.every((ex) => ex.shouldBeOOS)).toBe(true);
    });

    it('should generate requested count of examples', () => {
      const negatives = service.generateNegativeExamples(20);

      expect(negatives.length).toBe(20);
    });

    it('should have empty originalQuery for generated negatives', () => {
      const negatives = service.generateNegativeExamples(5);

      expect(negatives.every((ex) => ex.originalQuery === '')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return augmentation statistics', () => {
      const examples = [
        { query: 'Check CPU', intent: QueryIntent.INFORMATION_RETRIEVAL },
        { query: 'Install npm', intent: QueryIntent.PACKAGE_MANAGEMENT },
      ];

      const augmented = service.augmentExamples(examples);
      const stats = service.getStats(augmented);

      expect(stats.total).toBe(augmented.length);
      expect(stats.oosCount).toBe(augmented.length);
      expect(Object.keys(stats.byTechnique).length).toBeGreaterThan(0);
    });

    it('should count techniques correctly', () => {
      const examples = [{ query: 'Check CPU usage', intent: QueryIntent.INFORMATION_RETRIEVAL }];

      const augmented = service.augmentExamples(examples);
      const stats = service.getStats(augmented);

      const techniqueCount = Object.values(stats.byTechnique).reduce((a, b) => a + b, 0);
      expect(techniqueCount).toBe(augmented.length);
    });
  });

  describe('disabled techniques', () => {
    it('should not use disabled techniques', () => {
      const limitedService = new DataAugmentationService({
        enableKeywordRemoval: true,
        enableKeywordReplacement: false,
        enablePatternMixing: false,
        enableScopeViolation: false,
      });

      const examples = [
        { query: 'Check CPU', intent: QueryIntent.INFORMATION_RETRIEVAL },
        { query: 'Install npm', intent: QueryIntent.PACKAGE_MANAGEMENT },
        { query: 'Read file', intent: QueryIntent.FILE_READ },
        { query: 'Run script', intent: QueryIntent.SYSTEM_COMMAND },
      ];

      const augmented = limitedService.augmentExamples(examples);
      const stats = limitedService.getStats(augmented);

      // Should only use keyword removal
      expect(stats.byTechnique[AugmentationTechnique.KEYWORD_REMOVAL]).toBeGreaterThan(0);
      expect(stats.byTechnique[AugmentationTechnique.KEYWORD_REPLACEMENT]).toBe(0);
      expect(stats.byTechnique[AugmentationTechnique.PATTERN_MIXING]).toBe(0);
      expect(stats.byTechnique[AugmentationTechnique.SCOPE_VIOLATION]).toBe(0);
    });
  });
});
