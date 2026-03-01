# Contributing to Neura

Thank you for your interest in contributing to Neura! This document provides
guidelines and standards for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)

## Code of Conduct

This project adheres to the [Code of Conduct](./CODE_OF_CONDUCT.md). By
participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/neura.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Workflow

1. Make your changes
2. Run tests: `pnpm test`
3. Run linter: `pnpm lint`
4. Format code: `pnpm format`
5. Build: `pnpm build`
6. Commit with conventional message (see below)
7. Push to your fork
8. Create a Pull Request

## Commit Message Convention

Neura follows [Conventional Commits](https://www.conventionalcommits.org/)
specification. This enables automatic changelog generation and clear version
management.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                                           |
| ---------- | --------------------------------------------------------------------- |
| `feat`     | A new feature                                                         |
| `fix`      | A bug fix                                                             |
| `docs`     | Documentation only changes                                            |
| `style`    | Changes that don't affect code meaning (formatting, semicolons, etc.) |
| `refactor` | Code change that neither fixes a bug nor adds a feature               |
| `perf`     | Performance improvement                                               |
| `test`     | Adding or correcting tests                                            |
| `chore`    | Changes to build process, dependencies, or auxiliary tools            |
| `ci`       | Changes to CI configuration                                           |
| `security` | Security-related changes                                              |

### Scopes

Common scopes for Neura:

- `api` - API layer changes
- `graph` - LangGraph workflow changes
- `intent` - Intent classification system
- `security` - Security model changes
- `config` - Configuration system
- `logging` - Logging framework
- `cli` - Command line interface
- `daemon` - Daemon mode
- `deps` - Dependency updates

### Examples

```
feat(intent): add file_write intent classification

Adds support for file write operations with proper security classification.
Includes tests and documentation updates.
```

```
fix(security): correct permission_modification detection

Fixes false positive where chmod commands were not being properly
detected as permission modifications.
```

```
docs(readme): update architecture diagram

Replaces outdated architecture diagram with new distributed model.
```

```
refactor(graph): simplify node factory pattern

Removes unnecessary abstraction layer from node creation.
No functional changes.
```

```
test(api): add unit tests for query service

Adds comprehensive test coverage for QueryService with mocked
workflow dependencies.
```

### Breaking Changes

For breaking changes, add `!` after type/scope and include `BREAKING CHANGE:` in
footer:

```
feat(api)!: change response schema for query endpoint

BREAKING CHANGE: Response now returns 'sessionId' instead of 'requestId'.
Migration guide: Update client code to use new field name.
```

## Pull Request Process

1. **Create a descriptive PR title** following commit convention
2. **Fill out the PR template** completely
3. **Link related issues** using `Fixes #123` or `Closes #456`
4. **Ensure CI passes** (tests, linting, build)
5. **Request review** from maintainers
6. **Address feedback** promptly
7. **Squash commits** if requested

### PR Checklist

- [ ] Tests added/updated for new code
- [ ] Documentation updated (README, docs/)
- [ ] Commit messages follow convention
- [ ] No breaking changes without proper notice
- [ ] Code follows project style guidelines
- [ ] Self-review completed

## Coding Standards

### TypeScript

- Use strict TypeScript mode
- Explicit return types on public methods
- Avoid `any` - use `unknown` with type guards
- Prefer interfaces over types for object shapes

### Code Style

- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multi-line objects/arrays
- Max line length: 100 characters

### File Organization

```
src/
├── feature/
│   ├── index.ts          # Public exports
│   ├── feature.service.ts
│   ├── feature.controller.ts
│   └── feature.spec.ts   # Tests co-located
```

### Naming Conventions

- **Files**: kebab-case.ts
- **Classes**: PascalCase
- **Interfaces**: PascalCase with I prefix (ILogger)
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Enums**: PascalCase for name, UPPER_SNAKE_CASE for values

## Testing

### Unit Tests

- Co-located with source files: `*.spec.ts`
- Use descriptive test names
- Mock external dependencies
- Test edge cases and error conditions

### Test Structure

```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should do something when condition', async () => {
      // Arrange
      const input = { ... };
      
      // Act
      const result = await service.method(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Running Tests

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
pnpm test -- --grep "pattern"  # Run specific tests
```

## Questions?

- Open a [Discussion](https://github.com/peekaboo5149/neura/discussions) for
  questions
- Check existing [Issues](https://github.com/peekaboo5149/neura/issues) before
  creating new ones
- Review [Documentation](./docs/) for detailed information

Thank you for contributing to Neura!
