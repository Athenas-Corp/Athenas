const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig');

module.exports = {
  // Configuração básica
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Roots e diretórios
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Transform
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Module resolution
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/',
  }),
  moduleFileExtensions: ['js', 'json', 'ts'],
  
  // Coverage configuration
  collectCoverage: false, // Por padrão desabilitado, ativado via CLI
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/**/*.module.ts',
    '!src/**/*.config.ts',
    '!src/**/dto/*.ts',
    '!src/**/entities/*.ts',
    '!src/**/interfaces/*.ts',
    '!src/**/types/*.ts',
    '!src/**/constants/*.ts',
    '!src/**/enums/*.ts',
    '!src/main.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  
  // Test execution
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],
  
  // Performance
  maxWorkers: '50%',
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
      },
    ],
  ],
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  
  // TypeScript configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      isolatedModules: true,
    },
  },
  
  // Timeout configuration
  testTimeout: 30000,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
};
