/**
 * Main Vitest configuration for unit and integration tests
 * Using real implementations, no mocks
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Use threads for parallel test execution
    threads: true,
    
    // Global test timeout (5 minutes for blockchain operations)
    testTimeout: 300000,
    
    // Hook timeout
    hookTimeout: 60000,
    
    // Environment setup
    environment: 'node',
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'build/**',
        'test/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
        '**/*.d.ts',
        'vitest.*.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
    
    // Test file patterns
    include: [
      'test/**/*.test.ts',
      'test/**/*.spec.ts',
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/**',
      'build/**',
      'test/e2e/**',  // E2E tests run separately
    ],
    
    // Setup files
    setupFiles: ['./test/setup/global-setup.ts'],
    
    // Global variables available in tests
    globals: true,
    
    // Reporter configuration
    reporters: ['verbose'],
    
    // Retry failed tests (useful for network operations)
    retry: 2,
    
    // Pool options for worker threads
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1,
      },
    },
    
    // File system watching
    watch: false,
    
    // Restore mocks automatically between tests
    restoreMocks: true,
    
    // Clear mocks automatically between tests
    clearMocks: true,
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@test': resolve(__dirname, './test'),
    },
  },
  
  // ESBuild options for faster transforms
  esbuild: {
    target: 'node18',
  },
});