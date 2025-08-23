import { z } from 'zod';
import { 
  loadAPIKeys, 
  saveAPIKeys, 
  setAPIKey, 
  removeAPIKey, 
  listAPIKeys, 
  validateAPIKey, 
  getConfigInfo,
  importFromEnv,
  resetConfig,
  backupConfig,
  APIKeys
} from '../utils/config.js';

// Input validation schemas for different operations
export const SetAPIKeyInputSchema = z.object({
  keyName: z.enum([
    'ALCHEMY_API_KEY',
    'INFURA_API_KEY',
    'ETHERSCAN_API_KEY',
    'POLYGONSCAN_API_KEY',
    'ARBISCAN_API_KEY',
    'OPTIMISTIC_ETHERSCAN_API_KEY',
    'BASESCAN_API_KEY',
    'SNOWTRACE_API_KEY',
    'BSCSCAN_API_KEY'
  ]),
  value: z.string().min(1, "API key value cannot be empty")
});

export const RemoveAPIKeyInputSchema = z.object({
  keyName: z.enum([
    'ALCHEMY_API_KEY',
    'INFURA_API_KEY',
    'ETHERSCAN_API_KEY',
    'POLYGONSCAN_API_KEY',
    'ARBISCAN_API_KEY',
    'OPTIMISTIC_ETHERSCAN_API_KEY',
    'BASESCAN_API_KEY',
    'SNOWTRACE_API_KEY',
    'BSCSCAN_API_KEY'
  ])
});

export const SetMultipleAPIKeysInputSchema = z.object({
  apiKeys: z.record(z.string(), z.string())
});

export interface APIKeyOperationResult {
  success: boolean;
  message: string;
  details?: any;
  error?: string;
}

/**
 * Set a single API key
 */
export async function setAPIKeyTool(input: z.infer<typeof SetAPIKeyInputSchema>): Promise<APIKeyOperationResult> {
  try {
    const { keyName, value } = SetAPIKeyInputSchema.parse(input);
    
    console.log(`🔑 Setting API key: ${keyName}`);
    
    // Validate API key format
    const validation = validateAPIKey(keyName, value);
    if (!validation.valid) {
      return {
        success: false,
        message: `Invalid API key format for ${keyName}`,
        error: validation.message
      };
    }
    
    // Save the API key
    await setAPIKey(keyName, value);
    
    console.log(`✅ API key ${keyName} saved successfully`);
    
    return {
      success: true,
      message: `API key ${keyName} has been saved successfully`,
      details: {
        keyName,
        configured: true
      }
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to set API key:`, error.message);
    return {
      success: false,
      message: `Failed to set API key`,
      error: error.message
    };
  }
}

/**
 * Remove a single API key
 */
export async function removeAPIKeyTool(input: z.infer<typeof RemoveAPIKeyInputSchema>): Promise<APIKeyOperationResult> {
  try {
    const { keyName } = RemoveAPIKeyInputSchema.parse(input);
    
    console.log(`🗑️  Removing API key: ${keyName}`);
    
    await removeAPIKey(keyName);
    
    console.log(`✅ API key ${keyName} removed successfully`);
    
    return {
      success: true,
      message: `API key ${keyName} has been removed`,
      details: {
        keyName,
        configured: false
      }
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to remove API key:`, error.message);
    return {
      success: false,
      message: `Failed to remove API key`,
      error: error.message
    };
  }
}

/**
 * Set multiple API keys at once
 */
export async function setMultipleAPIKeysTool(input: z.infer<typeof SetMultipleAPIKeysInputSchema>): Promise<APIKeyOperationResult> {
  try {
    const { apiKeys } = SetMultipleAPIKeysInputSchema.parse(input);
    
    console.log(`🔑 Setting ${Object.keys(apiKeys).length} API keys...`);
    
    const results: { key: string; success: boolean; error?: string }[] = [];
    const validatedKeys: Partial<APIKeys> = {};
    
    // Validate all keys first
    for (const [key, value] of Object.entries(apiKeys)) {
      if (!key.endsWith('_API_KEY')) {
        results.push({ key, success: false, error: 'Key name must end with _API_KEY' });
        continue;
      }
      
      const validation = validateAPIKey(key as keyof APIKeys, value);
      if (!validation.valid) {
        results.push({ key, success: false, error: validation.message });
        continue;
      }
      
      validatedKeys[key as keyof APIKeys] = value;
      results.push({ key, success: true });
    }
    
    // Save all validated keys
    if (Object.keys(validatedKeys).length > 0) {
      await saveAPIKeys(validatedKeys);
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successfully set ${successful} API keys`);
    if (failed > 0) {
      console.log(`⚠️  Failed to set ${failed} API keys`);
    }
    
    return {
      success: successful > 0,
      message: `Set ${successful} API keys successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      details: {
        successful,
        failed,
        results
      }
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to set multiple API keys:`, error.message);
    return {
      success: false,
      message: `Failed to set API keys`,
      error: error.message
    };
  }
}

/**
 * List all API keys and their status
 */
export async function listAPIKeysTool(): Promise<APIKeyOperationResult> {
  try {
    console.log(`📋 Listing API key configuration...`);
    
    const keyStatus = await listAPIKeys();
    const configInfo = await getConfigInfo();
    
    const configured = keyStatus.filter(k => k.configured);
    const missing = keyStatus.filter(k => !k.configured);
    
    console.log(`✅ Found ${configured.length} configured API keys`);
    
    return {
      success: true,
      message: `API key status retrieved`,
      details: {
        configFile: configInfo.configFile,
        exists: configInfo.exists,
        totalKeys: keyStatus.length,
        configuredKeys: configured.length,
        missingKeys: missing.length,
        lastUpdated: configInfo.lastUpdated,
        keys: keyStatus
      }
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to list API keys:`, error.message);
    return {
      success: false,
      message: `Failed to list API keys`,
      error: error.message
    };
  }
}

/**
 * Import API keys from environment variables
 */
export async function importAPIKeysFromEnvTool(): Promise<APIKeyOperationResult> {
  try {
    console.log(`📥 Importing API keys from environment variables...`);
    
    const result = await importFromEnv();
    
    console.log(`✅ Imported ${result.imported.length} API keys from environment`);
    if (result.skipped.length > 0) {
      console.log(`⚠️  Skipped ${result.skipped.length} missing environment variables`);
    }
    
    return {
      success: true,
      message: `Imported ${result.imported.length} API keys from environment variables`,
      details: {
        imported: result.imported,
        skipped: result.skipped,
        importedCount: result.imported.length,
        skippedCount: result.skipped.length
      }
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to import API keys:`, error.message);
    return {
      success: false,
      message: `Failed to import API keys from environment`,
      error: error.message
    };
  }
}

/**
 * Reset all API key configuration
 */
export async function resetAPIKeysTool(): Promise<APIKeyOperationResult> {
  try {
    console.log(`🔄 Resetting API key configuration...`);
    
    // Backup before reset
    const backupFile = await backupConfig();
    await resetConfig();
    
    console.log(`✅ API key configuration reset successfully`);
    
    return {
      success: true,
      message: `API key configuration has been reset`,
      details: {
        backupFile,
        message: 'All API keys have been removed. A backup was created before reset.'
      }
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to reset configuration:`, error.message);
    return {
      success: false,
      message: `Failed to reset API key configuration`,
      error: error.message
    };
  }
}

/**
 * Get configuration information
 */
export async function getConfigInfoTool(): Promise<APIKeyOperationResult> {
  try {
    console.log(`📊 Getting configuration information...`);
    
    const info = await getConfigInfo();
    const keyStatus = await listAPIKeys();
    const configured = keyStatus.filter(k => k.configured);
    
    console.log(`✅ Configuration info retrieved`);
    
    return {
      success: true,
      message: `Configuration information retrieved`,
      details: {
        ...info,
        configuredKeys: configured.map(k => k.key),
        configuredCount: configured.length,
        totalKeys: keyStatus.length
      }
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to get configuration info:`, error.message);
    return {
      success: false,
      message: `Failed to get configuration information`,
      error: error.message
    };
  }
}

/**
 * Format API key management result for display
 */
export function formatAPIKeyResult(result: APIKeyOperationResult): string {
  const sections = [
    result.success ? '# ✅ API Key Operation Successful' : '# ❌ API Key Operation Failed',
    '',
    `**Message:** ${result.message}`,
    ''
  ];
  
  if (result.error) {
    sections.push(
      `**Error:** ${result.error}`,
      ''
    );
  }
  
  if (result.details) {
    sections.push('## 📋 Details', '');
    
    if (result.details.keys) {
      sections.push('### API Key Status', '');
      sections.push('| Key | Configured | Source |');
      sections.push('|-----|------------|--------|');
      
      result.details.keys.forEach((key: any) => {
        const status = key.configured ? '✅' : '❌';
        sections.push(`| ${key.key} | ${status} | ${key.source} |`);
      });
      sections.push('');
    }
    
    if (result.details.configFile) {
      sections.push(`**Config File:** \`${result.details.configFile}\``);
      sections.push(`**Exists:** ${result.details.exists ? '✅ Yes' : '❌ No'}`);
      if (result.details.lastUpdated) {
        sections.push(`**Last Updated:** ${result.details.lastUpdated}`);
      }
      sections.push('');
    }
    
    if (result.details.imported) {
      sections.push(
        '### Imported Keys',
        ...result.details.imported.map((key: string) => `- ✅ ${key}`),
        ''
      );
    }
    
    if (result.details.skipped && result.details.skipped.length > 0) {
      sections.push(
        '### Skipped Keys',
        ...result.details.skipped.map((key: string) => `- ⚠️  ${key}`),
        ''
      );
    }
    
    if (result.details.results) {
      sections.push('### Operation Results', '');
      result.details.results.forEach((res: any) => {
        const status = res.success ? '✅' : '❌';
        const error = res.error ? ` (${res.error})` : '';
        sections.push(`- ${status} ${res.key}${error}`);
      });
      sections.push('');
    }
  }
  
  return sections.join('\\n');
}