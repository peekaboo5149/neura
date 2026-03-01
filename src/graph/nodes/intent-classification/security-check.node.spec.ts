/* eslint-disable @typescript-eslint/strict-boolean-expressions */

/**
 * Security Check Node Tests
 *
 * Tests for the security-check.node.ts pure function.
 */

import { QueryIntent, SecurityClassification } from '@api/query/query-intent.enum';
import { GraphState } from '../../core/types';
import { createSecurityCheckNode } from './security-check.node';

describe('SecurityCheckNode', () => {
  const securityCheckNode = createSecurityCheckNode();

  const createMockState = (input: string, intent?: QueryIntent): GraphState => ({
    input,
    inputType: 'query',
    results: intent
      ? {
          intent: {
            intent,
            reason: 'Test reason',
          },
        }
      : {},
    metadata: {
      startTime: new Date().toISOString(),
      nodeExecutionLog: [],
    },
    context: {},
  });

  describe('out of scope detection', () => {
    it('should block queries starting with "who"', async () => {
      const state = createMockState('Who is the president?');
      const result = await securityCheckNode(state);

      expect(result.results?.security).toEqual({
        classification: SecurityClassification.SAFE,
        canExecute: false,
      });
    });

    it('should block queries starting with "what"', async () => {
      const state = createMockState('What is the weather?');
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(false);
    });

    it('should block queries starting with "where"', async () => {
      const state = createMockState('Where is the library?');
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(false);
    });

    it('should block queries starting with "when"', async () => {
      const state = createMockState('When is the meeting?');
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(false);
    });

    it('should block queries starting with "tell me"', async () => {
      const state = createMockState('Tell me a joke');
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(false);
    });

    it('should block queries starting with "explain"', async () => {
      const state = createMockState('Explain quantum physics');
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(false);
    });

    it('should block queries starting with "joke"', async () => {
      const state = createMockState('joke about programmers');
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(false);
    });

    it('should block queries starting with "buy me"', async () => {
      const state = createMockState('Buy me a coffee');
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(false);
    });
  });

  describe('SAFE intent classification', () => {
    it('should allow FILE_READ intent', async () => {
      const state = createMockState('Read the package.json', QueryIntent.FILE_READ);
      const result = await securityCheckNode(state);

      expect(result.results?.security).toEqual({
        classification: SecurityClassification.SAFE,
        canExecute: true,
      });
    });

    it('should allow INFORMATION_RETRIEVAL intent', async () => {
      const state = createMockState(
        'Search for TypeScript docs',
        QueryIntent.INFORMATION_RETRIEVAL
      );
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(true);
    });

    it('should allow MEMORY_QUERY intent', async () => {
      const state = createMockState('Show me our previous conversation', QueryIntent.MEMORY_QUERY);
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(true);
    });
  });

  describe('SENSITIVE intent classification', () => {
    it('should allow SYSTEM_COMMAND intent with confirmation', async () => {
      const state = createMockState('Create a new directory', QueryIntent.SYSTEM_COMMAND);
      const result = await securityCheckNode(state);

      expect(result.results?.security).toEqual({
        classification: SecurityClassification.SENSITIVE,
        canExecute: true,
      });
    });

    it('should allow PACKAGE_MANAGEMENT intent', async () => {
      const state = createMockState('Install lodash', QueryIntent.PACKAGE_MANAGEMENT);
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(true);
    });

    it('should allow FILE_WRITE intent', async () => {
      const state = createMockState('Delete temp folder', QueryIntent.FILE_WRITE);
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(true);
    });
  });

  describe('RESTRICTED intent classification', () => {
    it('should block PERMISSION_MODIFICATION intent', async () => {
      const state = createMockState('chmod 777 everything', QueryIntent.PERMISSION_MODIFICATION);
      const result = await securityCheckNode(state);

      expect(result.results?.security).toEqual({
        classification: SecurityClassification.RESTRICTED,
        canExecute: false,
      });
    });

    it('should block SSH_KEY_ACCESS intent', async () => {
      const state = createMockState('Show my SSH key', QueryIntent.SSH_KEY_ACCESS);
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(false);
    });

    it('should block PASSWORD_ACCESS intent', async () => {
      const state = createMockState('Read /etc/passwd', QueryIntent.PASSWORD_ACCESS);
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(false);
    });

    it('should block CRYPTO_MINING intent', async () => {
      const state = createMockState('Start mining', QueryIntent.CRYPTO_MINING);
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(false);
    });
  });

  describe('UNKNOWN intent handling', () => {
    it('should handle UNKNOWN intent as SAFE by default', async () => {
      const state = createMockState('Something random', QueryIntent.UNKNOWN);
      const result = await securityCheckNode(state);

      expect(result.results?.security?.canExecute).toBe(true);
    });

    it('should handle missing intent in results', async () => {
      const state = createMockState('Some query');
      delete state.results.intent;
      const result = await securityCheckNode(state);

      expect(result.results?.security?.classification).toBe(SecurityClassification.SAFE);
    });
  });

  describe('metadata tracking', () => {
    it('should add securityCheck to nodeExecutionLog', async () => {
      const state = createMockState('Read file', QueryIntent.FILE_READ);
      const result = await securityCheckNode(state);

      expect(result.metadata?.nodeExecutionLog).toContain('securityCheck');
    });

    it('should preserve existing nodeExecutionLog entries', async () => {
      const state = createMockState('Read file', QueryIntent.FILE_READ);
      state.metadata.nodeExecutionLog = ['previousNode'];
      const result = await securityCheckNode(state);

      expect(result.metadata?.nodeExecutionLog).toEqual(['previousNode', 'securityCheck']);
    });
  });
});
