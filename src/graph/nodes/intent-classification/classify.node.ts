/**
 * Classify Intent Node
 *
 * Node that classifies user input into a QueryIntent using LLM.
 * Pure function that receives dependencies via factory pattern.
 */

import { QueryIntent, QueryIntentMetadata } from '@api/query/query-intent.enum';
import { GraphNode, GraphState } from '../../core/types';
import { ClassificationResult, ClassifyIntentNodeDependencies } from './types';

/**
 * Build the system prompt for intent classification
 */
function buildSystemPrompt(): string {
  const intentDescriptions = Object.entries(QueryIntentMetadata)
    .map(([intent, metadata]) => {
      return `- ${intent}: ${metadata.description}
    Examples: ${metadata.examples.join(', ')}
    Keywords: ${metadata.keywords.join(', ')}`;
    })
    .join('\n\n');

  return `You are a strict security-focused intent classifier for Neura.

Your task is to classify user queries into exactly one of the following intents:

${intentDescriptions}

CLASSIFICATION RULES:
1. Choose the SINGLE most appropriate intent
2. When uncertain, choose the MORE RESTRICTIVE intent
3. If the query is outside system automation scope, classify as UNKNOWN
4. Consider security implications carefully

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

Respond with a JSON object containing:
- intent: The classified QueryIntent value (must be a valid enum value)
- reason: Comprehensive reasoning explaining the classification decision`;
}

/**
 * Call OpenAI API for classification
 */
async function callOpenAI(
  input: string,
  deps: ClassifyIntentNodeDependencies
): Promise<ClassificationResult> {
  const systemPrompt = buildSystemPrompt();

  try {
    // eslint-disable-next-line no-undef
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deps.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: deps.model,
        temperature: deps.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Classify this query: "${input}"` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        intent: QueryIntent.UNKNOWN,
        reason: `API error: ${response.status} - ${errorText}`,
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };

    const content = data.choices[0]?.message?.content;

    if (!content) {
      return {
        intent: QueryIntent.UNKNOWN,
        reason: 'Empty response from API',
        success: false,
        error: 'Empty response',
      };
    }

    // Parse the JSON response
    const parsed = JSON.parse(content) as { intent: string; reason: string };

    // Validate the intent is a valid QueryIntent
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    const intent = Object.values(QueryIntent).find((i) => i === parsed.intent) as
      | QueryIntent
      | undefined;

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!intent) {
      return {
        intent: QueryIntent.UNKNOWN,
        reason: `Invalid intent returned: ${parsed.intent}`,
        success: false,
        error: `Invalid intent: ${parsed.intent}`,
      };
    }

    return {
      intent,
      reason: parsed.reason || 'No reason provided',
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      intent: QueryIntent.UNKNOWN,
      reason: `Classification failed: ${errorMessage}`,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Create the classify intent node
 *
 * Factory function that receives dependencies and returns a pure node function.
 */
export function createClassifyIntentNode(deps: ClassifyIntentNodeDependencies): GraphNode {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    const result = await callOpenAI(state.input, deps);

    return {
      results: {
        ...state.results,
        intent: {
          intent: result.intent,
          reason: result.reason,
        },
      },
      metadata: {
        ...state.metadata,
        nodeExecutionLog: [...state.metadata.nodeExecutionLog, 'classifyIntent'],
      },
    };
  };
}
