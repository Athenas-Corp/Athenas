/**
 * Jest setup file for global test configuration
 * This file is executed before each test file
 */

import pino from 'pino';

// Cria um logger para os testes
export const logger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

// Set timezone for consistent date testing
process.env.TZ = 'UTC';

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to route through logger (optional)
// Assim você evita avisos do ESLint
global.console = {
  ...console,
  log: (...args: unknown[]): void => logger.info(...args),
  debug: (...args: unknown[]): void => logger.debug(...args),
  info: (...args: unknown[]): void => logger.info(...args),
  warn: (...args: unknown[]): void => logger.warn(...args),
  error: (...args: unknown[]): void => logger.error(...args),
};


// Global test utilities
global.beforeEach((): void => {
  jest.clearAllMocks();
});

beforeAll(async (): Promise<void> => {
  logger.info('Global test setup started');
});

afterAll(async (): Promise<void> => {
  logger.info('Global test teardown finished');
});


// Custom matchers or global test setup
beforeAll(async () => {
  logger.info('Global test setup started');
});

afterAll(async () => {
  logger.info('Global test teardown finished');
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error({ reason, promise }, 'Unhandled Rejection detected in tests');
});


// Export test utilities if needed
export const testUtils = {
  logger,
  // Add other common test utilities here
};
