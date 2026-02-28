# OpenClaw

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.7-black?logo=fastify)](https://www.fastify.io/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

An intelligent personal assistant framework with agent management, skill
orchestration, and extensible AI capabilities. Built with enterprise-grade
architecture patterns for production-ready deployments.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Testing](#testing)
- [Future Extensibility](#future-extensibility)

## Features

- **Agent Management**: Lifecycle management and orchestration of AI agents
- **Skill Management**: Modular skill registration and composition system
- **Enterprise Logging**: Structured logging with multiple engines (JSON,
  Pretty), log levels, and AsyncLocalStorage-based trace context propagation
- **Dependency Injection**: Clean architecture with tsyringe DI container
- **Configuration Management**: Type-safe, validated configuration using Zod
  schemas with fail-fast validation
- **Security**: Built-in security headers (Helmet), CORS, and CSRF protection
- **Graceful Shutdown**: Proper signal handling for zero-downtime deployments
- **Path Aliases**: Clean imports with TypeScript path mapping

## Tech Stack

| Category            | Technology                                               |
| ------------------- | -------------------------------------------------------- |
| **Runtime**         | Node.js 18+                                              |
| **Language**        | TypeScript 5.9                                           |
| **Framework**       | Fastify 5.7                                              |
| **Security**        | @fastify/helmet, @fastify/cors, @fastify/csrf-protection |
| **DI Container**    | tsyringe                                                 |
| **Validation**      | Zod                                                      |
| **Testing**         | Jest, ts-jest                                            |
| **Linting**         | ESLint, @typescript-eslint                               |
| **Formatting**      | Prettier                                                 |
| **Package Manager** | pnpm                                                     |

## Architecture Overview

### Logging Architecture

The logging system follows a clean architecture with swappable engines:

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

**Key Features:**

- **ILoggerEngine Interface**: Abstract interface for pluggable log engines
- **LogLevel Enum**: TRACE, DEBUG, INFO, WARN, ERROR, FATAL, SILENT
- **AsyncLocalStorage Context**: Automatic trace ID propagation across async
  boundaries
- **Metadata Redaction**: Automatic PII/sensitive data redaction
- **Multiple Output Formats**: Pretty console for dev, JSON for production

### DI + Configuration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ConfigRegistry                           │
│              (Registry Pattern - Singleton)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──────┐ ┌───▼────┐ ┌────▼──────┐
│ ServerConfig │ │Logging │ │  Future   │
│              │ │ Config │ │  Configs  │
└──────────────┘ └────────┘ └───────────┘
        │            │            │
        └────────────┴────────────┘
                     │
        ┌────────────▼────────────┐
        │      DI Container       │
        │      (tsyringe)         │
└──────────────┬──────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐ ┌────▼───┐ ┌───▼────┐
│Health │ │ Logger │ │ Future │
│Controller│ │Factory │ │Services│
└───────┘ └────────┘ └────────┘
```

**Key Features:**

- **BaseConfig<T>**: Abstract base class with Zod schema validation
- **Fail-Fast Validation**: Configs validate at startup with clear error
  messages
- **Environment Variable Mapping**: Automatic env var to config mapping with
  prefixes
- **Type Safety**: Full TypeScript type inference from Zod schemas
- **Constructor Injection**: Clean dependency injection in controllers and
  services

## Project Structure

```
openclaw/
├── src/
│   ├── api/                    # API layer (controllers, services)
│   │   └── health/
│   │       ├── health.controller.ts
│   │       └── health.service.ts
│   ├── bootstrap/              # Application bootstrap
│   │   ├── server.ts           # Fastify setup, graceful shutdown
│   │   └── registerRoutes.ts   # Route registration
│   ├── config/                 # Configuration management
│   │   ├── core/               # Base config classes
│   │   │   ├── base.config.ts
│   │   │   └── config.registry.ts
│   │   ├── server.config.ts
│   │   ├── logging.config.ts
│   │   └── container.ts        # DI container setup
│   ├── logging/                # Enterprise logging framework
│   │   ├── interfaces/         # ILogger, ILoggerEngine
│   │   ├── engines/            # ConsolePrettyEngine, JsonConsoleEngine
│   │   ├── context/            # AsyncLocalStorage trace context
│   │   ├── config/             # Logger configuration
│   │   ├── Logger.ts           # Main Logger class
│   │   ├── LoggerFactory.ts    # Logger instance factory
│   │   └── LogLevel.ts         # Log level definitions
│   ├── types/                  # Shared type definitions
│   └── main.ts                 # Application entry point
├── test/                       # E2E tests
├── .husky/                     # Git hooks
├── .github/                    # GitHub templates
├── eslint.config.mjs           # ESLint configuration
├── jest.config.js              # Jest configuration
├── tsconfig.json               # TypeScript configuration
└── package.json
```

## Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **pnpm**: v10 or higher (package manager)

### Installation

```bash
# Clone the repository
git clone https://github.com/peekaboo5149/openclaw.git
cd openclaw

# Install dependencies
pnpm install
```

## Environment Variables

Create a `.env` file in the project root:

```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Logging Configuration
LOG_LEVEL=info
LOG_ENGINE=console-pretty
LOG_ENABLE_COLORS=true
```

### Configuration Reference

| Variable            | Description                                       | Default          |
| ------------------- | ------------------------------------------------- | ---------------- |
| `PORT`              | Server port                                       | `3000`           |
| `HOST`              | Server host                                       | `0.0.0.0`        |
| `NODE_ENV`          | Environment mode                                  | `development`    |
| `LOG_LEVEL`         | Log verbosity level                               | `info`           |
| `LOG_ENGINE`        | Logging engine (`console-pretty`, `json-console`) | `console-pretty` |
| `LOG_ENABLE_COLORS` | Enable colored output                             | `true`           |

## Development

### Start Development Server

```bash
# Fast transpile-only mode (recommended for development)
pnpm dev

# With full type checking (slower)
pnpm dev:typecheck
```

### Build for Production

```bash
pnpm build
```

### Linting & Formatting

```bash
# Run ESLint
pnpm lint

# Fix ESLint issues
pnpm lint:fix

# Format code with Prettier
pnpm format

# Check formatting
pnpm format:check

# Type check without emitting
pnpm typecheck
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run E2E tests only
pnpm test:e2e
```

### Test Structure

- **Unit Tests**: Co-located with source files (`*.spec.ts`)
- **E2E Tests**: Located in `test/` directory
- **Coverage**: HTML reports generated in `coverage/` directory

## Future Extensibility

The architecture is designed for easy extension:

### Adding New API Modules

1. Create controller and service in `src/api/{module}/`
2. Register routes in `src/bootstrap/registerRoutes.ts`
3. Add `@injectable()` decorator for DI

### Adding New Log Engines

1. Implement `ILoggerEngine` interface
2. Add engine to `src/logging/engines/`
3. Register in `LoggerFactory`

### Adding New Configuration

1. Create schema with Zod
2. Extend `BaseConfig<T>`
3. Register in `ConfigRegistry`
4. Access via DI or `getConfigRegistry()`

### Planned Features

- [ ] Agent lifecycle management
- [ ] Skill registration system
- [ ] Plugin architecture
- [ ] WebSocket support
- [ ] OpenAPI documentation
- [ ] Metrics and monitoring

## Contributing

Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for details on our code
of conduct and contribution guidelines.

## Author

**Tanmay Kumar** - <ktanmay5149@gmail.com>

## License

This project is licensed under the ISC License - see the repository for details.
