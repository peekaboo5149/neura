import { BaseController } from '@bootstrap/base.controller';
import { Logger } from '@logging';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { inject, injectable } from 'tsyringe';
import { QueryService } from './query.service';

/**
 * Request body interface for query endpoint.
 */
interface QueryBody {
  /** Natural language query from the user */
  query: string;
  /** Optional context for query execution */
  context?: Record<string, unknown>;
}

/**
 * JSON Schema for query request validation.
 * Fastify uses this to validate incoming requests automatically.
 */
const querySchema = {
  body: {
    type: 'object',
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        description: 'Natural language query from the user',
      },
      context: {
        type: 'object',
        description: 'Optional context for query execution',
      },
    },
  },
};

/**
 * QueryController handles natural language queries and executes commands.
 *
 * This controller provides an endpoint for users to send natural language
 * queries which are parsed into executable commands. It serves as the
 * primary interface for agent interaction in the Neura framework.
 *
 * @example
 * ```bash
 * POST /api/v1/query
 * {
 *   "query": "Check the system health status",
 *   "context": { "userId": "123" }
 * }
 * ```
 */
@injectable()
export class QueryController implements BaseController {
  private readonly logger: Logger;

  /**
   * Creates an instance of QueryController.
   */
  constructor(@inject(QueryService) private readonly queryService: QueryService) {
    this.logger = new Logger('QueryController');
  }

  /**
   * Register the routes for the query controller.
   *
   * @param fastify - The Fastify instance to register the routes with.
   */
  registerRoutes(fastify: FastifyInstance): void {
    fastify.post<{ Body: QueryBody }>(
      '/api/v1/query',
      { schema: querySchema },
      this.executeCommand.bind(this)
    );
  }

  /**
   * Execute a command based on the natural language query.
   *
   * The request body is already validated by Fastify using the JSON Schema.
   *
   * @param request - Fastify request containing the validated query in the body
   * @param reply - Fastify reply for sending the response
   */
  private async executeCommand(
    request: FastifyRequest<{ Body: QueryBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const { query, context } = request.body;

    this.logger.info('Query received', { query });

    try {
      const response = await this.queryService.execute(query, context);

      return reply.send({
        success: true,
        query,
        response,
        context,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        'Query execution failed',
        error instanceof Error ? error : new Error(errorMessage)
      );

      return reply.status(500).send({
        success: false,
        error: errorMessage,
      });
    }
  }
}
