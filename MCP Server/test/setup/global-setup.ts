/**
 * Global setup for all tests
 * Configures environment and provides common utilities
 */
import { config } from 'dotenv';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Load environment variables
config();

// Test directory management
let testDir: string;

/**
 * Global test environment setup
 */
export function setupTestEnvironment() {
  // Override environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
  
  // Disable hardware wallet in tests
  process.env.DISABLE_HARDWARE_WALLET = 'true';
  
  // Set test timeouts
  process.env.TEST_TIMEOUT = '300000';
}

/**
 * Create isolated test directory
 */
export function createTestDirectory(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dao-deployer-test-'));
  process.env.DAO_DEPLOYER_DATA_DIR = dir;
  return dir;
}

/**
 * Clean up test directory
 */
export function cleanupTestDirectory(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to cleanup test directory ${dir}:`, error);
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 30000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Sleep for specified milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Global hooks
beforeAll(() => {
  setupTestEnvironment();
});

beforeEach(() => {
  testDir = createTestDirectory();
});

afterEach(() => {
  if (testDir) {
    cleanupTestDirectory(testDir);
  }
});

afterAll(() => {
  // Final cleanup
  if (process.env.DAO_DEPLOYER_DATA_DIR) {
    cleanupTestDirectory(process.env.DAO_DEPLOYER_DATA_DIR);
  }
});

// Export test directory getter
export function getTestDirectory(): string {
  return testDir;
}