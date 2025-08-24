/**
 * Vitest configuration for end-to-end tests
 * Tests complete workflows and multi-step operations
 */
import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    
    // E2E tests need the most time
    testTimeout: 900000, // 15 minutes
    
    // Only include E2E tests
    include: [
      'test/e2e/**/*.test.ts',
      'test/e2e/**/*.spec.ts',
    ],
    
    // Setup files for E2E environment
    setupFiles: [
      './test/setup/global-setup.ts',
      './test/setup/e2e-setup.ts',
    ],
    
    // Run E2E tests sequentially
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 1,
        minForks: 1,
      },
    },
    
    // E2E specific reporters
    reporters: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/e2e-results.json',
      html: './test-results/e2e-report.html',
    },
    
    // No retry for E2E tests - they should be deterministic
    retry: 0,
  },
});