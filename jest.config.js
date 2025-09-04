// jest.config.js
module.exports = {
  // Ambiente de teste
  testEnvironment: 'node',
  
  // Padrões de arquivos de teste
  testMatch: [
    '**/__tests__/**/*.(test|spec).ts',
    '**/*.(test|spec).ts'
  ],
  
  // Transformação de arquivos TypeScript
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Extensões de arquivo suportadas
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Root directories
  roots: ['<rootDir>/src'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/jest.setup.ts'],
  
  // Cobertura de código
  collectCoverage: false, // Será habilitada via CLI quando necessário
  
  // Diretório de saída da cobertura
  coverageDirectory: 'coverage',
  
  // Formatos de relatório de cobertura
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary'
  ],
  
  // Padrões para coleta de cobertura
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.module.ts',
    '!src/**/*.config.ts',
    '!src/main.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  
  // Thresholds de cobertura (configuração global - pode ser sobrescrita via CLI)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // Arquivos/diretórios ignorados
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/'
  ],
  
  // Ignorar cobertura para estes arquivos
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/'
  ],
  
  // Configurações do módulo
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1'
  },
  
  // Configurações específicas para NestJS (se aplicável)
  preset: 'ts-jest',
  
  // Configurações de timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Detectar arquivos abertos
  detectOpenHandles: true,
  
  // Forçar saída após testes
  forceExit: true,
  
  // Limpar mocks automaticamente
  clearMocks: true,
  
  // Restaurar mocks automaticamente
  restoreMocks: true,
  
  // Configurações específicas para diferentes tipos de teste
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.module.ts',
        '!src/**/*.config.ts',
        '!src/main.ts'
      ]
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.module.ts',
        '!src/**/*.config.ts',
        '!src/main.ts'
      ]
    }
  ]
};
