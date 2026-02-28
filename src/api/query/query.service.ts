import { OpenAIConfig } from '@config/openai.config';
import { Logger } from '@logging/Logger';
import { OpenAI } from 'openai';
import { inject, injectable } from 'tsyringe';

@injectable()
export class QueryService {
  private readonly logger: Logger;
  private readonly openai: OpenAI;

  constructor(@inject(OpenAIConfig) private readonly openAIConfig: OpenAIConfig) {
    this.logger = new Logger('QueryService');
    this.openai = new OpenAI({
      apiKey: this.openAIConfig.apiKey,
      timeout: this.openAIConfig.timeout,
    });
  }

  public async execute(query: string, _context?: Record<string, unknown>): Promise<string> {
    this.logger.info('Query received', { query, model: this.openAIConfig.model });

    try {
      const response = await this.openai.chat.completions.create({
        model: this.openAIConfig.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Provide concise responses.',
          },
          { role: 'user', content: query },
        ],
        max_tokens: this.openAIConfig.maxTokens,
        temperature: this.openAIConfig.temperature,
      });

      const content = response.choices[0]?.message?.content ?? 'No response';
      this.logger.info('OpenAI response received', { content: content.substring(0, 100) });

      return content;
    } catch (error) {
      const errorToLog = error instanceof Error ? error : new Error(String(error));
      this.logger.error('OpenAI API call failed', errorToLog);
      throw errorToLog;
    }
  }
}
