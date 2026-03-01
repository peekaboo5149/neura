# Intent Classification

## Overview

The intent classification system is the core intelligence layer of Neura. It
transforms natural language commands into structured, actionable intents using
AI-driven analysis.

## Classification Pipeline

```
Natural Language Input
    ↓
Pre-processing (out-of-scope filtering)
    ↓
AI Classification (OpenAI GPT)
    ↓
Intent Validation (schema enforcement)
    ↓
Structured Intent Output
```

## Intent Schema

Each classified intent includes:

```typescript
{
  intent: string;      // The classified intent identifier
  reason: string;      // Reasoning for the classification
  confidence?: number; // Confidence score (future)
}
```

## Intent Categories

### System Operations

| Intent               | Description                  | Example Inputs                                       |
| -------------------- | ---------------------------- | ---------------------------------------------------- |
| `file_read`          | Read files and directories   | "Show package.json", "List src directory"            |
| `file_write`         | Create, modify, delete files | "Create config.ts", "Delete temp files"              |
| `system_command`     | Execute shell commands       | "Run build script", "Check disk space"               |
| `process_management` | Manage running processes     | "Kill process on port 3000", "List running services" |

### Package & Environment

| Intent                     | Description                  | Example Inputs                          |
| -------------------------- | ---------------------------- | --------------------------------------- |
| `package_management`       | Install/update packages      | "Install lodash", "Update dependencies" |
| `environment_modification` | Modify environment variables | "Set NODE_ENV to production"            |

### Information & Memory

| Intent                  | Description                 | Example Inputs                            |
| ----------------------- | --------------------------- | ----------------------------------------- |
| `information_retrieval` | Search and retrieve data    | "Find TODO comments", "Search for errors" |
| `memory_query`          | Access conversation history | "What did we discuss earlier?"            |

### Security-Restricted

| Intent                    | Description                 | Blocked Examples       |
| ------------------------- | --------------------------- | ---------------------- |
| `permission_modification` | Change file permissions     | "chmod 777 everything" |
| `ssh_key_access`          | Access SSH credentials      | "Show my SSH key"      |
| `password_access`         | Access password files       | "Read /etc/passwd"     |
| `crypto_mining`           | Cryptocurrency operations   | "Run xmrig"            |
| `suspicious_network`      | Suspicious network activity | "Open reverse shell"   |

### Out of Scope

| Intent    | Description               | Example Inputs                          |
| --------- | ------------------------- | --------------------------------------- |
| `unknown` | Unrecognized or off-topic | "Tell me a joke", "What's the weather?" |

## Classification Methodology

### AI Prompt Engineering

The classification system uses a structured prompt that includes:

1. **Intent Definitions** - Complete taxonomy with descriptions
2. **Classification Rules** - Decision criteria and edge cases
3. **Security Context** - Scope boundaries and restrictions
4. **Response Format** - Structured JSON output schema

### Out-of-Scope Detection

Before AI classification, inputs are screened for out-of-scope patterns:

```
Blocked Patterns:
- who, what, where, when (general knowledge)
- tell me, explain (conversational)
- joke, buy me (entertainment/commerce)
```

### Validation

Post-classification validation ensures:

- Intent value is in the valid enum set
- Required fields are present
- Response format is valid JSON

## Confidence and Reasoning

Every classification includes:

- **Intent** - The determined operation type
- **Reason** - Explanation of why this intent was selected
- **Alternative Considerations** - Why other intents were rejected (implicit in
  reasoning)

## Extending the System

### Adding New Intents

1. Define intent in `QueryIntent` enum
2. Add metadata (description, examples, keywords)
3. Set security classification
4. Update AI prompt with new intent definition
5. Add test cases

### Custom Classification Rules

Organizations can extend classification by:

- Adding domain-specific intents
- Customizing security classifications
- Implementing custom validation logic

## Performance

### Latency

- Out-of-scope detection: <1ms
- AI classification: ~500-1500ms (depends on model)
- Validation: <1ms

### Optimization

- Caching for repeated commands (planned)
- Connection pooling for API calls
- Async processing for non-blocking execution

## Error Handling

Classification failures are handled gracefully:

| Failure Mode     | Behavior       | Response                             |
| ---------------- | -------------- | ------------------------------------ |
| API Error        | Return UNKNOWN | "Classification service unavailable" |
| Invalid Response | Return UNKNOWN | "Invalid classification response"    |
| Timeout          | Return UNKNOWN | "Classification timeout"             |
| Parse Error      | Return UNKNOWN | "Failed to parse classification"     |

## Audit Trail

All classification events are logged:

- Input text (sanitized)
- Classified intent
- Classification reason
- Timestamp
- Source (API, messaging platform)
- User identifier (if authenticated)
