# Architecture

## High-Level Overview

Neura uses a layered architecture that separates concerns between the API layer,
business logic, and execution engine.

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   REST API   │  │    CLI       │  │  WebSocket   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────┐
│                  Query Processing                         │
│              (Intent Classification)                      │
└───────────────────────────┬───────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
┌─────────▼──────┐ ┌────────▼──────┐ ┌───────▼──────┐
│ Classify Node  │ │ Security Node │ │ Execute Node │
│                │ │               │ │              │
│ AI-powered     │ │ Risk assess   │ │ Perform      │
│ intent detect  │ │ & classify    │ │ operation    │
└────────────────┘ └───────────────┘ └──────────────┘
```

## Service Layer

The service layer handles incoming requests and orchestrates the query
processing workflow.

### Responsibilities

- Request validation
- Workflow initialization
- Result mapping
- Error handling

### Key Components

| Component       | Purpose                          |
| --------------- | -------------------------------- |
| `QueryService`  | Entry point for query processing |
| `HealthService` | System health monitoring         |

## Graph Processing Layer

Neura uses a graph-based architecture for processing queries. Each query flows
through a series of nodes that transform the state.

### Graph Structure

```
Input State
    ↓
[Classify Node] → Determines intent using AI
    ↓
[Security Node] → Assesses risk level
    ↓
[Execute Node] → Performs operation (future)
    ↓
Output State
```

### State Management

The graph maintains a shared state that flows through all nodes:

```typescript
interface GraphState {
    input: string; // Original user input
    inputType: string; // Type of input (query, command)
    results: object; // Accumulated results from nodes
    metadata: object; // Execution metadata
    context: object; // Additional context
}
```

Each node receives the current state and returns a partial state that gets
merged.

## Node Architecture

Nodes are pure functions that receive dependencies through a factory pattern.

### Node Types

| Node                 | Purpose                          | Dependencies                 |
| -------------------- | -------------------------------- | ---------------------------- |
| `ClassifyIntentNode` | Classifies input into intent     | OpenAI API key, model config |
| `SecurityCheckNode`  | Assesses security classification | Security rules               |

### Design Principles

1. **Pure Functions** - Nodes don't have side effects
2. **Dependency Injection** - Dependencies passed via factory
3. **Composable** - Nodes can be chained and rearranged
4. **Testable** - Easy to mock dependencies for testing

## Execution Flow

```
1. User submits query
        ↓
2. QueryService creates initial state
        ↓
3. Workflow invokes graph with state
        ↓
4. ClassifyNode calls AI to determine intent
        ↓
5. SecurityNode classifies risk level
        ↓
6. Results mapped to response format
        ↓
7. Response returned to user
```

## Infrastructure Components

### Logging System

Neura includes an enterprise-grade logging framework:

```
┌─────────────────────────────────────────────────────────────┐
│                         Logger                              │
│  - Business logic, filtering, context enrichment           │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌────────▼────────┐
│ ConsolePretty  │      │  JsonConsole    │
│   Engine       │      │    Engine       │
│                │      │                 │
│ Human-readable │      │ Structured JSON │
│ output         │      │ for log aggregation
└────────────────┘      └─────────────────┘
```

**Features:**

- Multiple output engines (pretty console, JSON)
- Log level filtering (TRACE, DEBUG, INFO, WARN, ERROR, FATAL)
- Async context propagation for trace IDs
- Metadata enrichment

### Configuration System

Type-safe configuration with Zod schema validation:

```
┌─────────────────────────────────────────────────────────────┐
│                    ConfigRegistry                           │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──────┐ ┌───▼────┐ ┌────▼──────┐
│ ServerConfig │ │Logging │ │  Future   │
│              │ │ Config │ │  Configs  │
└──────────────┘ └────────┘ └───────────┘
```

**Features:**

- Fail-fast validation at startup
- Environment variable mapping
- Type-safe access
- Constructor injection support

## Security Architecture

Security is implemented at multiple layers:

1. **Intent Classification** - AI model trained to recognize restricted
   operations
2. **Security Classification** - Rule-based risk assessment
3. **Confirmation Gates** - User approval for sensitive operations
4. **Execution Guardrails** - Blocked operations cannot execute

See [Security Model](./security-model.md) for detailed information.

## Scalability Considerations

### Horizontal Scaling

- Statelessness enables multiple server instances
- No session affinity required
- Externalize state for persistence (future)

### Vertical Scaling

- Async/await throughout for non-blocking I/O
- Efficient graph execution
- Minimal memory footprint per request

## Future Extensions

The architecture supports:

- **Additional Nodes** - New processing steps can be inserted
- **Sub-graphs** - Complex operations can use nested graphs
- **Multiple Interfaces** - CLI, WebSocket, REST share the same core
- **Plugin System** - Custom intents and handlers (planned)
