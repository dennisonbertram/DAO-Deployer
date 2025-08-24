/**
 * Vitest configuration for integration tests
 * Tests MCP protocol, blockchain interactions, and file system operations
 */
import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    
    // Integration tests need more time
    testTimeout: 600000, // 10 minutes
    
    // Only include integration tests
    include: [
      'test/integration/**/*.test.ts',
      'test/integration/**/*.spec.ts',
    ],
    
    // Setup files for integration environment
    setupFiles: [
      './test/setup/global-setup.ts',
      './test/setup/integration-setup.ts',
    ],
    
    // Run tests sequentially for integration tests
    // to avoid port conflicts with Anvil
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 1,
        minForks: 1,
      },
    },
    
    // Specific reporter for integration tests
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/integration-results.json',
    },
  },
});