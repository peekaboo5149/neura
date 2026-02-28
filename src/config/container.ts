import 'reflect-metadata';
import { container } from 'tsyringe';
import { OpenAIConfig } from './openai.config';

/**
 * Dependency Injection Container Configuration
 *
 * This module configures the tsyringe DI container for the application.
 * All service registrations are centralized here for easy management.
 */

/**
 * Initialize the DI container with all application services
 * This should be called once at application startup
 */
export function initializeContainer(): void {
  // Services are auto-registered via @injectable decorator
  // Additional manual registrations can be added here if needed

  // Register config classes for direct injection
  container.register(OpenAIConfig, { useClass: OpenAIConfig });
}

/**
 * Get the configured DI container instance
 */
export function getContainer(): typeof container {
  return container;
}

/**
 * Resolve a service from the container
 * @param token - The class or token to resolve
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolve<T>(token: new (...args: any[]) => T): T {
  return container.resolve(token);
}

// Re-export container for direct access when needed
export { container };
