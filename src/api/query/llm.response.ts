import { QueryIntent } from './query-intent.enum';

/**
 * LLM classification response structure.
 *
 * This interface defines the expected response format from the LLM
 * when classifying user queries into intent categories.
 */
export interface QueryClassificationResponse {
  /** The classified intent - must be one of the valid QueryIntent values */
  intent: QueryIntent;

  /**
   * Comprehensive reasoning for the classification decision.
   * Should explain:
   * - Which keywords/patterns matched
   * - Why this intent was chosen over alternatives
   * - Security considerations that influenced the decision
   */
  reason: string;
}
