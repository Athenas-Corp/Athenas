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
  log: (...args: any[]) => logger.info(...args),
  debug: (...args: any[]) => logger.debug(...args),
  info: (...args: any[]) => logger.info(...args),
  warn: (...args: any[]) => logger.warn(...args),
  error: (...args: any[]) => logger.error(...args),
};

// Global test utilities
global.beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Custom matchers or global test setup
beforeAll(async () => {
  logger.info('Global test setup started');
});

afterAll(async () => {
  logger.info('Global test teardown finished');
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection detected in tests');
  // Não exit no ambiente de teste
});

// Export test utilities if needed
export const testUtils = {
  logger,
  // Add other common test utilities here
};
