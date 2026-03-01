/**
 * Data Augmentation Service
 *
 * Implements negative data augmentation for improved OOS detection.
 * Based on research: "Intent Detection in the Age of LLMs" (Arora et al., 2024)
 *
 * Strategy:
 * 1. Keyword removal - Remove key terms to create invalid queries
 * 2. Keyword replacement - Replace keywords with random strings
 * 3. Intent confusion - Mix patterns from different intents
 * 4. Scope violations - Create queries outside Neura's capabilities
 *
 * Benefits:
 * - Better decision boundaries for classifier
 * - Improved OOS detection (>5% accuracy gain)
 * - Reduced false positives
 */

import { QueryIntent, QueryIntentMetadata } from '@api/query/query-intent.enum';
import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';

export interface AugmentedExample {
  originalQuery: string;
  augmentedQuery: string;
  technique: AugmentationTechnique;
  shouldBeOOS: boolean;
  metadata?: Record<string, unknown>;
}

export enum AugmentationTechnique {
  KEYWORD_REMOVAL = 'keyword_removal',
  KEYWORD_REPLACEMENT = 'keyword_replacement',
  PATTERN_MIXING = 'pattern_mixing',
  SCOPE_VIOLATION = 'scope_violation',
  GENERAL_KNOWLEDGE = 'general_knowledge',
  PERSONAL_QUESTION = 'personal_question',
}

export const DataAugmentationConfigToken = Symbol('DataAugmentationConfig');

export interface DataAugmentationConfig {
  augmentationRatio?: number;
  enableKeywordRemoval?: boolean;
  enableKeywordReplacement?: boolean;
  enablePatternMixing?: boolean;
  enableScopeViolation?: boolean;
}

@injectable()
export class DataAugmentationService {
  private augmentationRatio: number;
  private enableKeywordRemoval: boolean;
  private enableKeywordReplacement: boolean;
  private enablePatternMixing: boolean;
  private enableScopeViolation: boolean;

  // Keywords to target for augmentation
  private readonly systemKeywords = [
    'file',
    'directory',
    'folder',
    'install',
    'update',
    'remove',
    'delete',
    'create',
    'run',
    'execute',
    'check',
    'status',
    'process',
    'memory',
    'cpu',
    'disk',
    'npm',
    'pnpm',
    'yarn',
    'git',
    'docker',
  ];

  private readonly actionKeywords = [
    'get',
    'show',
    'list',
    'read',
    'write',
    'copy',
    'move',
    'search',
    'find',
    'start',
    'stop',
    'restart',
    'kill',
  ];

  constructor(
    @inject(DataAugmentationConfigToken)
    config: DataAugmentationConfig = {}
  ) {
    this.augmentationRatio = config.augmentationRatio ?? 0.3;
    this.enableKeywordRemoval = config.enableKeywordRemoval ?? true;
    this.enableKeywordReplacement = config.enableKeywordReplacement ?? true;
    this.enablePatternMixing = config.enablePatternMixing ?? true;
    this.enableScopeViolation = config.enableScopeViolation ?? true;
  }

  /**
   * Generate augmented examples from a set of in-scope queries
   */
  augmentExamples(
    examples: Array<{ query: string; intent: QueryIntent }>
  ): AugmentedExample[] {
    const augmented: AugmentedExample[] = [];

    for (const example of examples) {
      // Generate multiple augmentations per example based on ratio
      const numAugmentations = Math.max(1, Math.floor(this.augmentationRatio * 3));

      for (let i = 0; i < numAugmentations; i++) {
        const aug = this.generateAugmentation(example.query, example.intent, i);
        if (aug) {
          augmented.push(aug);
        }
      }
    }

    return augmented;
  }

  /**
   * Generate negative examples for OOS training
   */
  generateNegativeExamples(count: number = 10): AugmentedExample[] {
    const negative: AugmentedExample[] = [];

    // General knowledge questions (outside Neura scope)
    const generalKnowledgeTemplates = [
      'What is the capital of {country}?',
      'Who wrote {book}?',
      'When did {event} happen?',
      'How does {concept} work?',
      'Why is {thing} important?',
      'Explain {topic} to me',
      'What are the benefits of {activity}?',
      'Tell me about {subject}',
    ];

    // Personal questions (outside Neura scope)
    const personalTemplates = [
      'What is your name?',
      'How are you feeling?',
      'Do you like {thing}?',
      'What do you think about {topic}?',
      'Can you help me with {task}?',
      'Tell me a joke',
      'What is your opinion on {subject}?',
    ];

    const placeholders = [
      'France',
      'Shakespeare',
      'WWII',
      'gravity',
      'education',
      'machine learning',
      'exercise',
      'history',
      'pizza',
      'politics',
    ];

    // Generate general knowledge negatives
    for (let i = 0; i < Math.floor(count / 2); i++) {
      const template = generalKnowledgeTemplates[i % generalKnowledgeTemplates.length];
      const placeholder = placeholders[i % placeholders.length];
      const query = template.replace(/{\w+}/, placeholder);

      negative.push({
        originalQuery: '',
        augmentedQuery: query,
        technique: AugmentationTechnique.GENERAL_KNOWLEDGE,
        shouldBeOOS: true,
        metadata: { category: 'general_knowledge' },
      });
    }

    // Generate personal question negatives
    for (let i = 0; i < Math.floor(count / 2); i++) {
      const template = personalTemplates[i % personalTemplates.length];
      const placeholder = placeholders[i % placeholders.length];
      const query = template.replace(/{\w+}/, placeholder);

      negative.push({
        originalQuery: '',
        augmentedQuery: query,
        technique: AugmentationTechnique.PERSONAL_QUESTION,
        shouldBeOOS: true,
        metadata: { category: 'personal_question' },
      });
    }

    return negative;
  }

  /**
   * Generate a single augmentation
   */
  private generateAugmentation(
    query: string,
    intent: QueryIntent,
    index: number
  ): AugmentedExample | null {
    const techniques: AugmentationTechnique[] = [];

    if (this.enableKeywordRemoval) techniques.push(AugmentationTechnique.KEYWORD_REMOVAL);
    if (this.enableKeywordReplacement) techniques.push(AugmentationTechnique.KEYWORD_REPLACEMENT);
    if (this.enablePatternMixing) techniques.push(AugmentationTechnique.PATTERN_MIXING);
    if (this.enableScopeViolation) techniques.push(AugmentationTechnique.SCOPE_VIOLATION);

    if (techniques.length === 0) return null;

    const technique = techniques[index % techniques.length];

    switch (technique) {
      case AugmentationTechnique.KEYWORD_REMOVAL:
        return this.applyKeywordRemoval(query, intent);
      case AugmentationTechnique.KEYWORD_REPLACEMENT:
        return this.applyKeywordReplacement(query, intent);
      case AugmentationTechnique.PATTERN_MIXING:
        return this.applyPatternMixing(query, intent);
      case AugmentationTechnique.SCOPE_VIOLATION:
        return this.applyScopeViolation(query, intent);
      default:
        return null;
    }
  }

  /**
   * Remove keywords to create invalid queries
   */
  private applyKeywordRemoval(query: string, intent: QueryIntent): AugmentedExample {
    const words = query.split(' ');
    const keywords = [...this.systemKeywords, ...this.actionKeywords];

    // Find and remove a keyword
    for (let i = 0; i < words.length; i++) {
      if (keywords.some((kw) => words[i].toLowerCase().includes(kw))) {
        const modified = [...words];
        modified.splice(i, 1);
        return {
          originalQuery: query,
          augmentedQuery: modified.join(' '),
          technique: AugmentationTechnique.KEYWORD_REMOVAL,
          shouldBeOOS: true,
          metadata: { removedWord: words[i], intent },
        };
      }
    }

    // Fallback: remove last word
    return {
      originalQuery: query,
      augmentedQuery: words.slice(0, -1).join(' '),
      technique: AugmentationTechnique.KEYWORD_REMOVAL,
      shouldBeOOS: true,
      metadata: { intent },
    };
  }

  /**
   * Replace keywords with random strings
   */
  private applyKeywordReplacement(query: string, intent: QueryIntent): AugmentedExample {
    const keywords = [...this.systemKeywords, ...this.actionKeywords];
    let modified = query;

    for (const keyword of keywords) {
      if (query.toLowerCase().includes(keyword)) {
        const replacement = this.generateRandomString(keyword.length);
        modified = modified.replace(new RegExp(keyword, 'gi'), replacement);
        return {
          originalQuery: query,
          augmentedQuery: modified,
          technique: AugmentationTechnique.KEYWORD_REPLACEMENT,
          shouldBeOOS: true,
          metadata: { replaced: keyword, with: replacement, intent },
        };
      }
    }

    return {
      originalQuery: query,
      augmentedQuery: modified,
      technique: AugmentationTechnique.KEYWORD_REPLACEMENT,
      shouldBeOOS: true,
      metadata: { intent },
    };
  }

  /**
   * Mix patterns from different intents
   */
  private applyPatternMixing(query: string, intent: QueryIntent): AugmentedExample {
    const allIntents = Object.values(QueryIntent).filter((i) => i !== intent);
    const randomIntent = allIntents[Math.floor(Math.random() * allIntents.length)];
    const otherMetadata = QueryIntentMetadata[randomIntent];

    // Mix keywords from different intents
    const mixedQuery = `${query} ${otherMetadata.keywords.slice(0, 2).join(' ')}`;

    return {
      originalQuery: query,
      augmentedQuery: mixedQuery,
      technique: AugmentationTechnique.PATTERN_MIXING,
      shouldBeOOS: true,
      metadata: { mixedWith: randomIntent, originalIntent: intent },
    };
  }

  /**
   * Create scope violations (queries outside Neura's capabilities)
   */
  private applyScopeViolation(query: string, intent: QueryIntent): AugmentedExample {
    const scopeViolations = [
      `Can you ${query.toLowerCase()} and also tell me about the weather?`,
      `Search Google for ${query}`,
      `Email me when you ${query}`,
      `Schedule a meeting to ${query}`,
      `Order pizza and ${query}`,
    ];

    const violation = scopeViolations[Math.floor(Math.random() * scopeViolations.length)];

    return {
      originalQuery: query,
      augmentedQuery: violation,
      technique: AugmentationTechnique.SCOPE_VIOLATION,
      shouldBeOOS: true,
      metadata: { originalIntent: intent },
    };
  }

  /**
   * Generate random string of given length
   */
  private generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get augmentation statistics
   */
  getStats(examples: AugmentedExample[]): {
    total: number;
    byTechnique: Record<AugmentationTechnique, number>;
    oosCount: number;
  } {
    const byTechnique: Record<string, number> = {};

    for (const technique of Object.values(AugmentationTechnique)) {
      byTechnique[technique] = 0;
    }

    for (const ex of examples) {
      byTechnique[ex.technique] = (byTechnique[ex.technique] ?? 0) + 1;
    }

    return {
      total: examples.length,
      byTechnique: byTechnique as Record<AugmentationTechnique, number>,
      oosCount: examples.filter((ex) => ex.shouldBeOOS).length,
    };
  }
}
