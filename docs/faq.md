# Frequently Asked Questions

## General

### What is Neura?

Neura is an AI-powered personal assistant that understands natural language and
translates it into secure system operations. Instead of memorizing commands, you
tell Neura what you want to achieve.

### How is Neura different from ChatGPT or Claude?

Neura is specifically designed for system automation, not general conversation.
It:

- Focuses on executing system operations
- Has built-in security classifications
- Rejects out-of-scope queries (general knowledge, chat)
- Requires confirmation for sensitive operations

### Is Neura safe to use?

Neura implements multiple security layers:

- AI-powered intent classification
- Rule-based security classification
- Confirmation gates for sensitive operations
- Blocked operations for restricted intents

However, users should still review confirmations carefully before approving
operations.

## Usage

### What can Neura do?

Neura can help with:

- File operations (read, write, delete)
- Package management (npm, pnpm, yarn)
- Process management
- Environment configuration
- Information retrieval
- Memory/conversation history

### What can't Neura do?

Neura explicitly rejects:

- General knowledge questions
- Conversational queries
- Security-sensitive operations (accessing passwords, SSH keys)
- Permission modifications
- Suspicious network operations

### How do I know what intent was detected?

Every query returns a response showing:

```json
{
    "intent": "file_read",
    "security": "safe",
    "canExecute": true,
    "reason": "Query involves reading a file"
}
```

### Why was my query rejected?

Queries are rejected for two reasons:

1. **Out of scope** - The query is not a system operation (e.g., "What's the
   weather?")
2. **Restricted intent** - The operation is security-sensitive (e.g., "Show my
   SSH key")

## Technical

### What AI model does Neura use?

Neura uses OpenAI's GPT models for intent classification. You need to provide
your own OpenAI API key.

### Does Neura store my data?

Currently, Neura does not persist conversation history or queries. Each request
is processed independently.

### Can I use Neura offline?

No. Intent classification requires an internet connection to call the OpenAI
API.

### What platforms are supported?

Neura runs on any platform that supports Node.js 18+:

- macOS
- Linux
- Windows (with WSL recommended)

## Development

### How do I add a new intent?

See the [Development Guide](./development-guide.md#adding-a-new-intent) for
step-by-step instructions.

### How do I run tests?

```bash
pnpm test          # Run all tests
pnpm test:watch    # Run in watch mode
pnpm test:coverage # Run with coverage report
```

### How do I contribute?

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a Pull Request

See [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) for guidelines.

## Troubleshooting

### "OpenAI API key not configured"

Add your OpenAI API key to the `.env` file:

```bash
OPENAI_API_KEY=sk-your-key-here
```

### "Intent classification failed"

This usually indicates:

1. Invalid OpenAI API key
2. Network connectivity issues
3. OpenAI API service issues

Check your API key and network connection.

### Tests are failing

Ensure you have:

1. Run `pnpm install` to install dependencies
2. Set up the `.env` file (some tests may need it)
3. Node.js 18+ installed

## Roadmap

### When will Neura be production-ready?

Neura is currently in MVP stage. See the [Roadmap](./roadmap.md) for planned
features and timeline.

### Will there be a CLI?

Yes, CLI support is planned for Phase 2. See the [Roadmap](./roadmap.md) for
details.

### Will Neura support plugins?

Yes, a plugin architecture is planned for Phase 5. This will allow custom
intents and third-party integrations.
