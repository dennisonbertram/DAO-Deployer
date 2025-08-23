import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { z } from 'zod';

/**
 * API Key Configuration Management
 * Persists user API keys in ~/.dao-deployer/config.json
 */

// Schema for API key configuration
export const APIKeysSchema = z.object({
  ALCHEMY_API_KEY: z.string().optional(),
  INFURA_API_KEY: z.string().optional(),
  ETHERSCAN_API_KEY: z.string().optional(),
  POLYGONSCAN_API_KEY: z.string().optional(),
  ARBISCAN_API_KEY: z.string().optional(),
  OPTIMISTIC_ETHERSCAN_API_KEY: z.string().optional(),
  BASESCAN_API_KEY: z.string().optional(),
  SNOWTRACE_API_KEY: z.string().optional(),
  BSCSCAN_API_KEY: z.string().optional(),
});

export type APIKeys = z.infer<typeof APIKeysSchema>;

// Configuration file path
const CONFIG_DIR = path.join(os.homedir(), '.dao-deployer');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Get the configuration directory path
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Get the configuration file path
 */
export function getConfigFile(): string {
  return CONFIG_FILE;
}

/**
 * Ensure configuration directory exists
 */
async function ensureConfigDir(): Promise<void> {
  try {
    await fs.access(CONFIG_DIR);
  } catch {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    console.log(`✅ Created configuration directory: ${CONFIG_DIR}`);
  }
}

/**
 * Load API keys from configuration file
 */
export async function loadAPIKeys(): Promise<APIKeys> {
  try {
    await ensureConfigDir();
    
    const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(configData);
    
    return APIKeysSchema.parse(parsed.apiKeys || {});
  } catch (error) {
    // If file doesn't exist or is invalid, return empty config
    return {};
  }
}

/**
 * Save API keys to configuration file
 */
export async function saveAPIKeys(apiKeys: Partial<APIKeys>): Promise<void> {
  try {
    await ensureConfigDir();
    
    // Load existing config
    let existingConfig: any = {};
    try {
      const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
      existingConfig = JSON.parse(configData);
    } catch {
      // File doesn't exist or is invalid, start with empty config
    }
    
    // Merge with existing API keys
    const currentKeys = existingConfig.apiKeys || {};
    const updatedKeys = { ...currentKeys, ...apiKeys };
    
    // Remove undefined/empty values
    Object.keys(updatedKeys).forEach(key => {
      if (!updatedKeys[key] || updatedKeys[key].trim() === '') {
        delete updatedKeys[key];
      }
    });
    
    const config = {
      ...existingConfig,
      apiKeys: updatedKeys,
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`✅ API keys saved to: ${CONFIG_FILE}`);
    
  } catch (error: any) {
    throw new Error(`Failed to save API keys: ${error.message}`);
  }
}

/**
 * Get a specific API key
 */
export async function getAPIKey(keyName: keyof APIKeys): Promise<string | undefined> {
  // First check environment variables
  const envValue = process.env[keyName];
  if (envValue) {
    return envValue;
  }
  
  // Then check saved configuration
  const apiKeys = await loadAPIKeys();
  return apiKeys[keyName];
}

/**
 * Set a specific API key
 */
export async function setAPIKey(keyName: keyof APIKeys, value: string): Promise<void> {
  const apiKeys = { [keyName]: value };
  await saveAPIKeys(apiKeys);
}

/**
 * Remove a specific API key
 */
export async function removeAPIKey(keyName: keyof APIKeys): Promise<void> {
  const apiKeys = await loadAPIKeys();
  delete apiKeys[keyName];
  await saveAPIKeys(apiKeys);
}

/**
 * List all configured API keys (without showing values)
 */
export async function listAPIKeys(): Promise<{ key: string; configured: boolean; source: 'env' | 'config' }[]> {
  const apiKeys = await loadAPIKeys();
  const allKeys: (keyof APIKeys)[] = [
    'ALCHEMY_API_KEY',
    'INFURA_API_KEY', 
    'ETHERSCAN_API_KEY',
    'POLYGONSCAN_API_KEY',
    'ARBISCAN_API_KEY',
    'OPTIMISTIC_ETHERSCAN_API_KEY',
    'BASESCAN_API_KEY',
    'SNOWTRACE_API_KEY',
    'BSCSCAN_API_KEY'
  ];
  
  return allKeys.map(key => {
    const envValue = process.env[key];
    const configValue = apiKeys[key];
    
    return {
      key,
      configured: !!(envValue || configValue),
      source: envValue ? 'env' : (configValue ? 'config' : 'env')
    };
  });
}

/**
 * Validate API key format (basic validation)
 */
export function validateAPIKey(keyName: keyof APIKeys, value: string): { valid: boolean; message?: string } {
  if (!value || value.trim().length === 0) {
    return { valid: false, message: 'API key cannot be empty' };
  }
  
  // Basic format validation
  const trimmed = value.trim();
  
  switch (keyName) {
    case 'ALCHEMY_API_KEY':
      if (trimmed.length < 20) {
        return { valid: false, message: 'Alchemy API key should be at least 20 characters' };
      }
      break;
      
    case 'INFURA_API_KEY':
      if (trimmed.length !== 32) {
        return { valid: false, message: 'Infura API key should be 32 characters' };
      }
      break;
      
    case 'ETHERSCAN_API_KEY':
    case 'POLYGONSCAN_API_KEY':
    case 'ARBISCAN_API_KEY':
    case 'OPTIMISTIC_ETHERSCAN_API_KEY':
    case 'BASESCAN_API_KEY':
    case 'SNOWTRACE_API_KEY':
    case 'BSCSCAN_API_KEY':
      if (!/^[A-Z0-9]{34}$/.test(trimmed)) {
        return { valid: false, message: 'Etherscan-style API key should be 34 uppercase alphanumeric characters' };
      }
      break;
  }
  
  return { valid: true };
}

/**
 * Get API key with fallback resolution (environment → config → undefined)
 */
export async function resolveAPIKey(keyName: keyof APIKeys): Promise<string | undefined> {
  return await getAPIKey(keyName);
}

/**
 * Backup configuration file
 */
export async function backupConfig(): Promise<string> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(CONFIG_DIR, `config.backup.${timestamp}.json`);
    
    await fs.copyFile(CONFIG_FILE, backupFile);
    return backupFile;
  } catch (error: any) {
    throw new Error(`Failed to backup configuration: ${error.message}`);
  }
}

/**
 * Reset configuration (remove all API keys)
 */
export async function resetConfig(): Promise<void> {
  try {
    // Create backup first
    await backupConfig();
    
    // Remove the config file
    await fs.unlink(CONFIG_FILE);
    console.log('✅ Configuration reset successfully');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('✅ Configuration was already empty');
      return;
    }
    throw new Error(`Failed to reset configuration: ${error.message}`);
  }
}

/**
 * Import API keys from environment variables
 */
export async function importFromEnv(): Promise<{ imported: string[]; skipped: string[] }> {
  const allKeys: (keyof APIKeys)[] = [
    'ALCHEMY_API_KEY',
    'INFURA_API_KEY',
    'ETHERSCAN_API_KEY',
    'POLYGONSCAN_API_KEY',
    'ARBISCAN_API_KEY',
    'OPTIMISTIC_ETHERSCAN_API_KEY',
    'BASESCAN_API_KEY',
    'SNOWTRACE_API_KEY',
    'BSCSCAN_API_KEY'
  ];
  
  const imported: string[] = [];
  const skipped: string[] = [];
  const toSave: Partial<APIKeys> = {};
  
  for (const key of allKeys) {
    const envValue = process.env[key];
    if (envValue && envValue.trim()) {
      toSave[key] = envValue.trim();
      imported.push(key);
    } else {
      skipped.push(key);
    }
  }
  
  if (Object.keys(toSave).length > 0) {
    await saveAPIKeys(toSave);
  }
  
  return { imported, skipped };
}

/**
 * Get configuration file status and info
 */
export async function getConfigInfo(): Promise<{
  configDir: string;
  configFile: string;
  exists: boolean;
  apiKeyCount: number;
  lastUpdated?: string;
}> {
  try {
    const exists = await fs.access(CONFIG_FILE).then(() => true).catch(() => false);
    let apiKeyCount = 0;
    let lastUpdated: string | undefined;
    
    if (exists) {
      const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(configData);
      apiKeyCount = Object.keys(config.apiKeys || {}).length;
      lastUpdated = config.updatedAt;
    }
    
    return {
      configDir: CONFIG_DIR,
      configFile: CONFIG_FILE,
      exists,
      apiKeyCount,
      lastUpdated
    };
  } catch (error) {
    return {
      configDir: CONFIG_DIR,
      configFile: CONFIG_FILE,
      exists: false,
      apiKeyCount: 0
    };
  }
}