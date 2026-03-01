/**
 * Intent Description Service
 *
 * Generates rich semantic descriptions for intents using LLM.
 * Based on research: "Intent Detection in the Age of LLMs" (Arora et al., 2024)
 *
 * This service enhances intent classification by:
 * 1. Generating detailed intent descriptions from examples
 * 2. Caching descriptions for performance
 * 3. Providing semantic context for better classification accuracy
 */

import { IQueryIntentMetadata, QueryIntent, QueryIntentMetadata } from '@api/query/query-intent.enum';
import OpenAI from 'openai';
import 'reflect-metadata';
import { inject, injectable } from 'tsyringe';

export interface IntentDescription {
  intent: QueryIntent;
  shortDescription: string;
  detailedDescription: string;
  typicalPatterns: string[];
  commonVerbs: string[];
  scopeBoundaries: string[];
  exampleScenarios: string[];
}

export const IntentDescriptionConfigToken = Symbol('IntentDescriptionConfig');

export interface IntentDescriptionConfig {
  apiKey: string;
  model?: string;
  cacheEnabled?: boolean;
}

@injectable()
export class IntentDescriptionService {
  private client: OpenAI;
  private model: string;
  private cache: Map<QueryIntent, IntentDescription> = new Map();
  private cacheEnabled: boolean;

  constructor(
    @inject(IntentDescriptionConfigToken)
    config: IntentDescriptionConfig
  ) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? 'gpt-4';
    this.cacheEnabled = config.cacheEnabled ?? true;
  }

  /**
   * Generate rich description for a single intent
   */
  async generateDescription(intent: QueryIntent): Promise<IntentDescription> {
    // Check cache first
    if (this.cacheEnabled && this.cache.has(intent)) {
      return this.cache.get(intent)!;
    }

    const metadata = QueryIntentMetadata[intent];
    const description = await this.callLLMForDescription(intent, metadata);

    // Cache the result
    if (this.cacheEnabled) {
      this.cache.set(intent, description);
    }

    return description;
  }

  /**
   * Generate descriptions for all intents
   */
  async generateAllDescriptions(): Promise<Map<QueryIntent, IntentDescription>> {
    const descriptions = new Map<QueryIntent, IntentDescription>();

    for (const intent of Object.values(QueryIntent)) {
      const description = await this.generateDescription(intent);
      descriptions.set(intent, description);
    }

    return descriptions;
}

  /**
   * Build enhanced system prompt with rich intent descriptions
   */
  async buildEnhancedSystemPrompt(): Promise<string> {
    const descriptions = await this.generateAllDescriptions();

    const intentSections = Array.from(descriptions.entries())
      .map(([intent, desc]) => {
        return `## ${intent}

${desc.detailedDescription}

**Typical Patterns:**
${desc.typicalPatterns.map((p) => `- ${p}`).join('\n')}

**Common Verbs:** ${desc.commonVerbs.join(', ')}

**Scope Boundaries:**
${desc.scopeBoundaries.map((b) => `- ${b}`).join('\n')}

**Example Scenarios:**
${desc.exampleScenarios.map((e) => `- ${e}`).join('\n')}

**Original Examples:**
${QueryIntentMetadata[intent].examples.map((e) => `- "${e}"`).join('\n')}`;
      })
      .join('\n\n---\n\n');

    return `You are a strict security-focused intent classifier for Neura.

Your task is to classify user queries into exactly one of the following intents.
Each intent includes detailed semantic descriptions, typical patterns, and scope boundaries.

=== INTENT DEFINITIONS ===

${intentSections}

=== CLASSIFICATION RULES ===

1. **Single Intent**: Choose exactly ONE most appropriate intent
2. **Security First**: When uncertain, choose the MORE RESTRICTIVE intent
3. **Scope Check**: If outside Neura's automation scope, classify as UNKNOWN
4. **Pattern Matching**: Consider typical patterns and common verbs for each intent
5. **Boundary Respect**: Never classify as RESTRICTED intents - they are blocked

=== NEURA'S CAPABILITIES ===

Neura handles:
- File and directory operations
- Process management
- Package management (npm, pnpm, yarn)
- Environment variables
- System commands
- Controlled network requests

Neura does NOT:
- Answer general knowledge questions
- Engage in conversation
- Answer personal questions
- Provide world facts
- Act as a chatbot

=== RESPONSE FORMAT ===

Respond with a JSON object:
{
  "intent": "The classified QueryIntent value",
  "reason": "Detailed reasoning: 1) Why this intent matches, 2) Why others don't match, 3) Security considerations"
}`;
  }

  /**
   * Call LLM to generate rich description
   */
  private async callLLMForDescription(
    intent: QueryIntent,
    metadata: IQueryIntentMetadata
  ): Promise<IntentDescription> {
    const prompt = `Analyze this intent and provide a rich semantic description.

Intent: ${intent}
Basic Description: ${metadata.description}
Examples: ${metadata.examples.join(', ')}
Keywords: ${metadata.keywords.join(', ')}

Generate a JSON response with:
1. shortDescription: One-line summary
2. detailedDescription: 2-3 sentences explaining what this intent means
3. typicalPatterns: 3-5 common query patterns (as strings)
4. commonVerbs: 5-10 verbs typically used (array of strings)
5. scopeBoundaries: 2-3 boundaries defining what's in/out of scope
6. exampleScenarios: 3 specific scenarios where this applies

Response format:
{
  "shortDescription": "...",
  "detailedDescription": "...",
  "typicalPatterns": ["...", "..."],
  "commonVerbs": ["...", "..."],
  "scopeBoundaries": ["...", "..."],
  "exampleScenarios": ["...", "..."]
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert in intent classification and natural language understanding.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return this.createFallbackDescription(intent, metadata);
      }

      const parsed = JSON.parse(content) as {
        shortDescription: string;
        detailedDescription: string;
        typicalPatterns: string[];
        commonVerbs: string[];
        scopeBoundaries: string[];
        exampleScenarios: string[];
      };

      return {
        intent,
        shortDescription: parsed.shortDescription,
        detailedDescription: parsed.detailedDescription,
        typicalPatterns: parsed.typicalPatterns,
        commonVerbs: parsed.commonVerbs,
        scopeBoundaries: parsed.scopeBoundaries,
        exampleScenarios: parsed.exampleScenarios,
      };
    } catch (error) {
      console.error(`Failed to generate description for ${intent}:`, error);
      return this.createFallbackDescription(intent, metadata);
    }
  }

  /**
   * Create fallback description from metadata
   */
  private createFallbackDescription(
    intent: QueryIntent,
    metadata: IQueryIntentMetadata
  ): IntentDescription {
    return {
      intent,
      shortDescription: metadata.description,
      detailedDescription: metadata.description,
      typicalPatterns: metadata.examples.map((e) => `Pattern like: "${e}"`),
      commonVerbs: metadata.keywords,
      scopeBoundaries: ['In-scope: Related to system operations', 'Out-of-scope: General queries'],
      exampleScenarios: metadata.examples.slice(0, 3),
    };
  }

  /**
   * Clear the description cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; enabled: boolean } {
    return {
      size: this.cache.size,
      enabled: this.cacheEnabled,
    };
  }
}
