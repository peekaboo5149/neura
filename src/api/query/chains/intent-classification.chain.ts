import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { QueryIntent } from '../query-intent.enum';

/**
 * Zod schema for intent classification output.
 * Used for structured output parsing with LangChain.
 */
export const IntentClassificationSchema = z.object({
  intent: z
    .nativeEnum(QueryIntent)
    .describe('The classified intent - must be one of the valid QueryIntent values'),
  reason: z
    .string()
    .describe('Comprehensive reasoning: matched keywords, why chosen, security considerations'),
});

/**
 * Type derived from the Zod schema.
 */
export type IntentClassificationOutput = z.infer<typeof IntentClassificationSchema>;

/**
 * IntentClassificationChain - LangChain chain for query intent classification.
 *
 * Uses direct message construction to avoid template parsing issues with
 * format instructions containing curly braces.
 *
 * Usage:
 * ```typescript
 * const chain = IntentClassificationChain.create(apiKey, model);
 * const result = await chain.classify("Install puppeteer");
 * // { intent: QueryIntent.PACKAGE_MANAGEMENT, reason: "..." }
 * ```
 */
export class IntentClassificationChain {
  private readonly model: ChatOpenAI;
  private readonly parser: StructuredOutputParser<typeof IntentClassificationSchema>;

  private constructor(model: ChatOpenAI) {
    this.model = model;
    this.parser = StructuredOutputParser.fromZodSchema(IntentClassificationSchema);
  }

  /**
   * Factory method to create an instance of the chain.
   *
   * @param apiKey - OpenAI API key
   * @param model - Model name (e.g., 'gpt-4')
   * @param temperature - Temperature for generation (default: 0.1 for consistency)
   * @returns Configured IntentClassificationChain instance
   */
  static create(apiKey: string, model: string, temperature = 0.1): IntentClassificationChain {
    const chatModel = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: model,
      temperature,
    });

    return new IntentClassificationChain(chatModel);
  }

  /**
   * Classify a user query into an intent.
   *
   * @param query - The natural language query
   * @returns Classification result with intent and reasoning
   */
  async classify(query: string): Promise<IntentClassificationOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const humanPrompt = `Classify this query: "${query}"`;

    const response = await this.model.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: humanPrompt },
    ]);

    const content =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    return this.parser.parse(content);
  }

  /**
   * Build the system prompt with embedded format instructions.
   * Uses string replacement to avoid template parsing issues.
   */
  private buildSystemPrompt(): string {
    const formatInstructions = this.parser.getFormatInstructions();

    return `
You are a strict security-focused intent classifier for Neura.

Neura ONLY handles:
- Files and directories
- Processes
- Package management
- Environment variables
- System commands
- Controlled network requests

Neura does NOT:
- Answer general knowledge
- Engage in conversation
- Answer personal questions
- Provide world facts
- Act like a chatbot

If the query is outside system automation scope, classify it as UNKNOWN.

When uncertain, choose the MORE RESTRICTIVE intent.

Classify into exactly one valid intent.

${formatInstructions}
`;
  }
}
