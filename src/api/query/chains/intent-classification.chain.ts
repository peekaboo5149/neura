import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { QueryIntent } from '../query-intent.enum';

/**
 * Zod schema for intent classification output.
 * Used for structured output parsing.
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
 * State annotation for the classification graph.
 * Uses LangGraph's Annotation system for type-safe state management.
 */
const ClassificationState = Annotation.Root({
  /** The input query to classify */
  query: Annotation<string>({ value: (_prev, next) => next }),

  /** The classified intent (set by model node) */
  intent: Annotation<QueryIntent | undefined>({
    default: () => undefined,
    value: (_prev, next) => next,
  }),

  /** Reasoning for the classification (set by model node) */
  reason: Annotation<string | undefined>({
    default: () => undefined,
    value: (_prev, next) => next,
  }),

  /** Error message if classification fails */
  error: Annotation<string | undefined>({
    default: () => undefined,
    value: (_prev, next) => next,
  }),

  /** System prompt with format instructions (built by prepare node) */
  systemPrompt: Annotation<string | undefined>({
    default: () => undefined,
    value: (_prev, next) => next,
  }),

  /** Raw model response content */
  rawResponse: Annotation<string | undefined>({
    default: () => undefined,
    value: (_prev, next) => next,
  }),
});

/**
 * Type alias for the classification state.
 */
type ClassificationStateType = typeof ClassificationState.State;

/**
 * IntentClassificationChain - LangGraph-based chain for query intent classification.
 *
 * Uses StateGraph to model the classification workflow as a directed graph
 * with nodes for prompt preparation, model invocation, and output parsing.
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
  private readonly graph: ReturnType<typeof this.buildGraph>;

  private constructor(model: ChatOpenAI) {
    this.model = model;
    this.parser = StructuredOutputParser.fromZodSchema(IntentClassificationSchema);
    this.graph = this.buildGraph();
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
    try {
      const finalState = await this.graph.invoke({ query });

      if (finalState.error) {
        return {
          intent: QueryIntent.UNKNOWN,
          reason: `Classification failed: ${finalState.error}`,
        };
      }

      return {
        intent: finalState.intent ?? QueryIntent.UNKNOWN,
        reason: finalState.reason ?? 'No reason provided',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        intent: QueryIntent.UNKNOWN,
        reason: `Classification failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Build the LangGraph state graph for classification.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private buildGraph() {
    // Node 1: Prepare the system prompt with format instructions
    const preparePromptNode = (
      _state: ClassificationStateType
    ): Partial<ClassificationStateType> => {
      const formatInstructions = this.parser.getFormatInstructions();

      const systemPrompt = `You are a strict security-focused intent classifier for Neura.

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

${formatInstructions}`;

      return { systemPrompt };
    };

    // Node 2: Call the LLM model
    const callModelNode = async (
      state: ClassificationStateType
    ): Promise<Partial<ClassificationStateType>> => {
      const humanPrompt = `Classify this query: "${state.query}"`;

      const response = await this.model.invoke([
        { role: 'system', content: state.systemPrompt! },
        { role: 'user', content: humanPrompt },
      ]);

      const rawResponse =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      return { rawResponse };
    };

    // Node 3: Parse the model output
    const parseOutputNode = async (
      state: ClassificationStateType
    ): Promise<Partial<ClassificationStateType>> => {
      try {
        const parsed = await this.parser.parse(state.rawResponse!);
        return {
          intent: parsed.intent,
          reason: parsed.reason,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { error: errorMessage };
      }
    };

    // Node 4: Handle errors
    const handleErrorNode = (state: ClassificationStateType): Partial<ClassificationStateType> => {
      return {
        intent: QueryIntent.UNKNOWN,
        reason: `Classification failed: ${state.error}`,
      };
    };

    // Build the state graph using the Annotation-based API
    const workflow = new StateGraph(ClassificationState)
      // Add nodes
      .addNode('preparePrompt', preparePromptNode)
      .addNode('callModel', callModelNode)
      .addNode('parseOutput', parseOutputNode)
      .addNode('handleError', handleErrorNode)

      // Add edges
      .addEdge(START, 'preparePrompt')
      .addEdge('preparePrompt', 'callModel')
      .addEdge('callModel', 'parseOutput')

      // Conditional edge: if error occurred, go to error handler, otherwise end
      .addConditionalEdges('parseOutput', (state) => {
        return state.error ? 'handleError' : END;
      })

      .addEdge('handleError', END);

    // Compile and return the graph
    return workflow.compile();
  }
}
