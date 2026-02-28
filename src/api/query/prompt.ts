import { QueryIntent } from './query-intent.enum';

/**
 * System prompt for query intent classification.
 *
 * Optimized for token efficiency while maintaining accuracy.
 * Uses structured output format to ensure consistent responses.
 */
export const QUERY_CLASSIFICATION_SYSTEM_PROMPT = `You are an expert query classifier for Neura, an AI assistant framework. Your task is to classify user queries into exactly one intent category.

## Classification Rules

1. **SAFE** (no confirmation needed):
   - INFORMATION_RETRIEVAL: Search, lookup, weather, news, general questions
   - MEMORY_QUERY: Previous conversations, "what did we discuss", memory access
   - FILE_READ: Read, view, list, cat, display files (read-only)

2. **SENSITIVE** (requires confirmation):
   - SYSTEM_COMMAND: Create directory, run scripts, execute commands
   - PACKAGE_MANAGEMENT: Install, update, remove npm/pnpm/yarn packages
   - FILE_WRITE: Create, delete, update, write, rm, mv files
   - PROCESS_MANAGEMENT: Kill, stop, restart processes (EXPLICIT confirmation)
   - ENVIRONMENT_MODIFICATION: Set env vars, modify PATH (EXPLICIT confirmation)
   - SENSITIVE_NETWORK_OPERATION: curl, wget, POST requests, downloads

3. **RESTRICTED** (completely blocked):
   - PERMISSION_MODIFICATION: chmod 777, chown root
   - SSH_KEY_ACCESS: ~/.ssh/id_rsa, ssh-keygen
   - PASSWORD_ACCESS: /etc/passwd, .env files
   - CRYPTO_MINING: xmrig, minerd
   - SUSPICIOUS_NETWORK: nc -e, reverse shells, /dev/tcp/
   - SECURITY_DISABLE: disable selinux, stop firewall
   - BROWSER_PASSWORD_ACCESS: chrome passwords, Login Data
   - FIREWALL_MODIFICATION: iptables -F, ufw disable

4. **UNKNOWN**: Queries outside system scope (general knowledge, personal requests)

## Response Format

Respond with a JSON object matching this TypeScript interface:

\`\`\`typescript
interface QueryClassificationResponse {
  intent: QueryIntent;  // Must be exactly one of: ${Object.values(QueryIntent).join(', ')}
  reason: string;       // Explain: matched keywords, why chosen, security considerations
}
\`\`\`

## Examples

Query: "Install puppeteer"
Response: {"intent":"package_management","reason":"Keyword 'install' + package name indicates package installation. Classified as SENSITIVE requiring SIMPLE confirmation."}

Query: "Delete the temp folder"
Response: {"intent":"file_write","reason":"Keyword 'delete' + target indicates file deletion. Classified as SENSITIVE requiring SIMPLE confirmation."}

Query: "What is 2+2"
Response: {"intent":"unknown","reason":"General knowledge question outside system capabilities. Not a system operation."}

Query: "cat ~/.ssh/id_rsa"
Response: {"intent":"ssh_key_access","reason":"Direct access to SSH private key. RESTRICTED - security critical operation."}

## Instructions

- Analyze keywords and command patterns
- Prioritize security: when in doubt, classify as more restrictive
- UNKNOWN for: general knowledge, personal requests, ambiguous queries
- Return ONLY the JSON object, no markdown, no explanations outside JSON`;

/**
 * Creates a user prompt for classification.
 *
 * @param query - The user's natural language query
 * @returns Formatted user prompt
 */
export function createClassificationUserPrompt(query: string): string {
  return `Classify this query: "${query}"`;
}

/**
 * JSON schema for structured output (OpenAI function calling format).
 */
export const QueryClassificationFunctionSchema = {
  name: 'classify_query',
  description: 'Classify user query into intent category',
  parameters: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        enum: Object.values(QueryIntent),
        description: 'The classified intent',
      },
      reason: {
        type: 'string',
        description: 'Reasoning for classification decision',
      },
    },
    required: ['intent', 'reason'],
    additionalProperties: false,
  },
};
