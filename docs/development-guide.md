# Development Guide

## Setup

### Prerequisites

- Node.js 18+
- pnpm 10+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/peekaboo5149/neura.git
cd neura

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required: OPENAI_API_KEY
```

### Development Commands

```bash
# Start development server (fast, no type checking)
pnpm dev

# Start with type checking (slower)
pnpm dev:typecheck

# Build for production
pnpm build

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run linter
pnpm lint

# Format code
pnpm format
```

## Project Structure

```
neura/
├── src/
│   ├── api/                    # API layer (controllers, services)
│   ├── bootstrap/              # Application bootstrap
│   ├── config/                 # Configuration management
│   ├── daemon/                 # Daemon mode support
│   ├── graph/                  # LangGraph workflow definitions
│   │   ├── core/               # State types and annotations
│   │   └── nodes/              # Graph nodes (intent, security, etc.)
│   ├── logging/                # Enterprise logging framework
│   └── main.ts                 # Application entry point
├── test/                       # E2E tests
└── docs/                       # Documentation
```

## Architecture Patterns

### Dependency Injection

Neura uses `tsyringe` for dependency injection:

```typescript
import { inject, injectable } from "tsyringe";

@injectable()
class MyService {
    constructor(
        @inject("Logger") private logger: ILogger,
    ) {}
}
```

### Configuration

Configurations use Zod schemas for validation:

```typescript
import { z } from "zod";

const MyConfigSchema = z.object({
    apiKey: z.string(),
    timeout: z.number().default(5000),
});

type MyConfig = z.infer<typeof MyConfigSchema>;
```

### Graph Nodes

Nodes are pure functions created via factory pattern:

```typescript
export function createMyNode(deps: MyNodeDependencies): GraphNode {
    return async (state: GraphState): Promise<Partial<GraphState>> => {
        // Process state
        return {
            results: {/* ... */},
        };
    };
}
```

## Adding a New Intent

1. **Add to enum** in `src/api/query/query-intent.enum.ts`:

```typescript
export enum QueryIntent {
    // ... existing intents
    MY_NEW_INTENT = "my_new_intent",
}

export const QueryIntentMetadata: Record<QueryIntent, IntentMetadata> = {
    // ... existing metadata
    [QueryIntent.MY_NEW_INTENT]: {
        description: "Description of the intent",
        examples: ["Example query 1", "Example query 2"],
        keywords: ["keyword1", "keyword2"],
    },
};
```

2. **Set security classification** in
   `src/graph/nodes/intent-classification/security-check.node.ts`:

```typescript
const SENSITIVE_INTENTS = new Set([
    // ... existing intents
    QueryIntent.MY_NEW_INTENT,
]);
```

3. **Add tests** in
   `src/graph/nodes/intent-classification/security-check.node.spec.ts`:

```typescript
it("should classify MY_NEW_INTENT", async () => {
    const state = createMockState("Example query", QueryIntent.MY_NEW_INTENT);
    const result = await securityCheckNode(state);
    expect(result.results?.security?.classification).toBe(
        SecurityClassification.SENSITIVE,
    );
});
```

## Testing Strategy

### Unit Tests

Co-located with source files (`*.spec.ts`):

```typescript
describe("MyService", () => {
    it("should do something", async () => {
        const service = new MyService();
        const result = await service.doSomething();
        expect(result).toBe(expected);
    });
});
```

### Mocking Dependencies

```typescript
// Mock external API
const mockCreate = jest.fn();
jest.mock("openai", () => {
    return jest.fn().mockImplementation(() => ({
        chat: { completions: { create: mockCreate } },
    }));
});

// Mock filesystem
jest.mock("fs/promises", () => ({
    readFile: jest.fn(),
    writeFile: jest.fn(),
}));
```

### E2E Tests

Located in `test/` directory:

```typescript
describe("E2E", () => {
    it("should process query end-to-end", async () => {
        const response = await fetch("http://localhost:3000/api/query", {
            method: "POST",
            body: JSON.stringify({ query: "test" }),
        });
        expect(response.status).toBe(200);
    });
});
```

## Code Standards

### TypeScript

- Strict mode enabled
- Explicit return types on public methods
- No `any` types (use `unknown` with type guards)

### Linting

- ESLint with TypeScript plugin
- Prettier for formatting
- Husky pre-commit hooks

### Commit Messages

Follow Conventional Commits:

```
feat: add new intent classification
test: add unit tests for security node
docs: update API documentation
fix: correct security classification logic
```

## Debugging

### Enable Debug Logging

```bash
LOG_LEVEL=debug pnpm dev
```

### VS Code Launch Configuration

```json
{
    "type": "node",
    "request": "launch",
    "name": "Debug Neura",
    "runtimeExecutable": "pnpm",
    "runtimeArgs": ["dev"],
    "env": {
        "LOG_LEVEL": "debug"
    }
}
```

## Common Issues

### reflect-metadata Error

Add to test files:

```typescript
import "reflect-metadata";
```

### Path Alias Resolution

Ensure `tsconfig-paths` is registered:

```bash
node -r tsconfig-paths/register dist/src/main.js
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make changes with tests
4. Run linter and tests (`pnpm lint && pnpm test`)
5. Commit with conventional message
6. Push and create Pull Request

See [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) for contribution guidelines.
