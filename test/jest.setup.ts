/**
 * Jest setup file for global test configuration
 * This file is executed before each test file
 */

// Set timezone for consistent date testing
process.env.TZ = 'UTC';

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to avoid noise in tests (optional)
// Uncomment if you want to suppress console logs during tests
/*
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
*/

// Global test utilities
global.beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Custom matchers or global test setup can go here
beforeAll(async () => {
  // Global setup before all tests
});

afterAll(async () => {
  // Global cleanup after all tests
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in test environment
});

// Export test utilities if needed
export const testUtils = {
  // Add common test utilities here
};
