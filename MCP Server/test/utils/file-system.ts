/**
 * File system test utilities
 * Provides helpers for testing file operations
 */
import { 
  mkdirSync, 
  writeFileSync, 
  readFileSync, 
  existsSync, 
  statSync, 
  rmSync,
  readdirSync,
  chmodSync,
} from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

/**
 * Create a temporary test directory
 */
export function createTempDir(prefix = 'dao-test-'): string {
  const tempPath = join(tmpdir(), `${prefix}${randomBytes(8).toString('hex')}`);
  mkdirSync(tempPath, { recursive: true });
  return tempPath;
}

/**
 * Clean up a directory
 */
export function cleanupDir(path: string): void {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

/**
 * Write a JSON file
 */
export function writeJsonFile(path: string, data: any): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Read a JSON file
 */
export function readJsonFile(path: string): any {
  const content = readFileSync(path, 'utf8');
  return JSON.parse(content);
}

/**
 * Write a text file
 */
export function writeTextFile(path: string, content: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, content, 'utf8');
}

/**
 * Read a text file
 */
export function readTextFile(path: string): string {
  return readFileSync(path, 'utf8');
}

/**
 * Check if file exists
 */
export function fileExists(path: string): boolean {
  return existsSync(path);
}

/**
 * Get file permissions (Unix-style octal)
 */
export function getFilePermissions(path: string): string {
  const stats = statSync(path);
  const mode = stats.mode & parseInt('777', 8);
  return '0' + mode.toString(8);
}

/**
 * Set file permissions
 */
export function setFilePermissions(path: string, mode: string | number): void {
  const modeNum = typeof mode === 'string' ? parseInt(mode, 8) : mode;
  chmodSync(path, modeNum);
}

/**
 * Check if permissions are secure (0600)
 */
export function hasSecurePermissions(path: string): boolean {
  const permissions = getFilePermissions(path);
  return permissions === '0600';
}

/**
 * List files in directory
 */
export function listFiles(path: string): string[] {
  if (!existsSync(path)) {
    return [];
  }
  return readdirSync(path);
}

/**
 * Create a mock API keys file
 */
export function createMockApiKeysFile(dir: string): string {
  const path = join(dir, 'api-keys.json');
  const mockKeys = {
    ALCHEMY_API_KEY: 'test-alchemy-key-123',
    ETHERSCAN_API_KEY: 'test-etherscan-key-456',
    encrypted: false,
    version: '1.0.0',
  };
  writeJsonFile(path, mockKeys);
  setFilePermissions(path, '0600');
  return path;
}

/**
 * Create a mock ephemeral wallet file
 */
export function createMockWalletFile(dir: string, address: string): string {
  const walletDir = join(dir, 'ephemeral-wallets');
  mkdirSync(walletDir, { recursive: true });
  
  const path = join(walletDir, `${address.slice(2)}.json`);
  const mockWallet = {
    address,
    privateKey: '0x' + randomBytes(32).toString('hex'),
    createdAt: new Date().toISOString(),
    network: 'sepolia',
  };
  
  writeJsonFile(path, mockWallet);
  setFilePermissions(path, '0600');
  return path;
}

/**
 * Verify file content matches expected
 */
export function verifyFileContent(path: string, expected: string | object): boolean {
  if (!existsSync(path)) {
    return false;
  }

  const content = readFileSync(path, 'utf8');
  
  if (typeof expected === 'string') {
    return content === expected;
  } else {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed) === JSON.stringify(expected);
    } catch {
      return false;
    }
  }
}

/**
 * Create a directory structure for testing
 */
export function createTestStructure(baseDir: string): void {
  const dirs = [
    'api-keys',
    'ephemeral-wallets',
    'deployments',
    'logs',
    'backups',
  ];

  for (const dir of dirs) {
    mkdirSync(join(baseDir, dir), { recursive: true });
  }
}

/**
 * Watch for file changes (returns cleanup function)
 */
export function watchFile(
  path: string,
  callback: (event: string) => void
): () => void {
  const { watch } = require('fs');
  const watcher = watch(path, (eventType: string) => {
    callback(eventType);
  });

  return () => watcher.close();
}

/**
 * Create a mock config file
 */
export function createMockConfig(dir: string): string {
  const path = join(dir, 'config.json');
  const config = {
    version: '1.0.0',
    networks: {
      sepolia: {
        rpcUrl: 'http://localhost:8545',
        chainId: 11155111,
      },
      mainnet: {
        rpcUrl: 'http://localhost:8546',
        chainId: 1,
      },
    },
    settings: {
      gasMultiplier: 1.2,
      confirmations: 2,
      timeout: 30000,
    },
  };
  
  writeJsonFile(path, config);
  return path;
}

/**
 * Simulate file corruption
 */
export function corruptFile(path: string): void {
  writeFileSync(path, 'CORRUPTED_DATA_' + randomBytes(16).toString('hex'), 'utf8');
}

/**
 * Get file size in bytes
 */
export function getFileSize(path: string): number {
  const stats = statSync(path);
  return stats.size;
}

/**
 * Get file modification time
 */
export function getFileModTime(path: string): Date {
  const stats = statSync(path);
  return stats.mtime;
}