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

    return `You are an expert query classifier for Neura, an AI assistant framework. Classify queries into exactly one intent.

## SAFE (no confirmation)
- INFORMATION_RETRIEVAL: Search, lookup, weather, news
- MEMORY_QUERY: Previous conversations, "what did we discuss"
- FILE_READ: Read, view, list files (read-only)

## SENSITIVE (requires confirmation)
- SYSTEM_COMMAND: Create directory, run scripts
- PACKAGE_MANAGEMENT: Install, update, remove packages
- FILE_WRITE: Create, delete, update files
- PROCESS_MANAGEMENT: Kill, stop processes (EXPLICIT)
- ENVIRONMENT_MODIFICATION: Set env vars (EXPLICIT)
- SENSITIVE_NETWORK_OPERATION: curl, wget, POST requests

## RESTRICTED (blocked)
- PERMISSION_MODIFICATION: chmod 777, chown root
- SSH_KEY_ACCESS: ~/.ssh/id_rsa
- PASSWORD_ACCESS: /etc/passwd, .env
- CRYPTO_MINING: xmrig, minerd
- SUSPICIOUS_NETWORK: nc -e, reverse shells
- SECURITY_DISABLE: disable selinux
- BROWSER_PASSWORD_ACCESS: chrome passwords
- FIREWALL_MODIFICATION: iptables -F

## UNKNOWN: Outside system scope

Rules:
- Analyze keywords and patterns
- Security first: when in doubt, classify as more restrictive
- UNKNOWN for general knowledge, personal requests

${formatInstructions}`;
  }
}
