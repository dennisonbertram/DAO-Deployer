import { z } from 'zod';
import { verifyContractWithForge } from '../utils/forge.js';
import { getNetworkConfig, resolveNetworkConfig } from '../networks/index.js';
import { getContractSourcePath, ContractName } from '../utils/contracts.js';
import { VerificationError } from '../types/index.js';

// Input validation schema for the verify-contract tool
export const VerifyContractInputSchema = z.object({
  contractAddress: z.string().refine(
    (addr) => addr.startsWith('0x') && addr.length === 42,
    { message: "Invalid Ethereum address format" }
  ),
  contractName: z.string(),
  networkName: z.string(),
  constructorArgs: z.array(z.string()).optional(),
  force: z.boolean().default(false) // Force verification even if already verified
});

export interface VerificationResult {
  success: boolean;
  contractAddress: string;
  networkName: string;
  verificationUrl?: string;
  explorerUrl?: string;
  error?: string;
  alreadyVerified?: boolean;
}

/**
 * Verify a deployed contract on the blockchain explorer
 */
export async function verifyContract(input: z.infer<typeof VerifyContractInputSchema>): Promise<VerificationResult> {
  try {
    const config = VerifyContractInputSchema.parse(input);
    
    // Get network configuration
    const networkConfig = await resolveNetworkConfig(getNetworkConfig(config.networkName));
    
    // Check if verification is supported on this network
    if (!networkConfig.explorerApiUrl || !networkConfig.explorerApiKey) {
      throw new VerificationError(
        `Contract verification not supported on ${networkConfig.name}. Explorer API configuration missing.`
      );
    }
    
    
    // Get contract source path
    let contractPath: string;
    try {
      contractPath = getContractSourcePath(config.contractName as ContractName);
    } catch {
      // If not in our known contracts, assume it's a path already
      contractPath = config.contractName.includes('.sol') 
        ? config.contractName 
        : `src/${config.contractName}.sol`;
    }
    
    // Attempt verification using Forge
    try {
      await verifyContractWithForge({
        contractAddress: config.contractAddress,
        contractPath: contractPath,
        contractName: extractContractName(config.contractName),
        constructorArgs: config.constructorArgs,
        rpcUrl: networkConfig.rpcUrl,
        verifierUrl: networkConfig.explorerApiUrl,
        etherscanApiKey: networkConfig.explorerApiKey!,
        chainId: networkConfig.chainId
      });
      
      const explorerUrl = `${networkConfig.explorerUrl}/address/${config.contractAddress}#code`;
      
      
      return {
        success: true,
        contractAddress: config.contractAddress,
        networkName: config.networkName,
        verificationUrl: explorerUrl,
        explorerUrl: networkConfig.explorerUrl
      };
      
    } catch (verificationError: any) {
      // Check if already verified
      if (verificationError.message.includes('Already verified') || 
          verificationError.message.includes('already verified')) {
        
        const explorerUrl = `${networkConfig.explorerUrl}/address/${config.contractAddress}#code`;
        
        
        return {
          success: true,
          contractAddress: config.contractAddress,
          networkName: config.networkName,
          verificationUrl: explorerUrl,
          explorerUrl: networkConfig.explorerUrl,
          alreadyVerified: true
        };
      }
      
      throw verificationError;
    }
    
  } catch (error: any) {
    
    return {
      success: false,
      contractAddress: input.contractAddress,
      networkName: input.networkName,
      error: error.message,
      explorerUrl: getNetworkConfig(input.networkName).explorerUrl
    };
  }
}

/**
 * Extract contract name from path or full name
 */
function extractContractName(nameOrPath: string): string {
  // If it contains .sol, extract the contract name after the colon
  if (nameOrPath.includes(':')) {
    return nameOrPath.split(':').pop() || nameOrPath;
  }
  
  // If it's just a name, return as is
  return nameOrPath;
}

/**
 * Batch verify multiple contracts
 */
export async function verifyMultipleContracts(
  contracts: Array<{
    address: string;
    name: string;
    constructorArgs?: string[];
  }>,
  networkName: string
): Promise<VerificationResult[]> {
  
  const results: VerificationResult[] = [];
  
  
  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];
    
    
    try {
      const result = await verifyContract({
        contractAddress: contract.address,
        contractName: contract.name,
        networkName: networkName,
        constructorArgs: contract.constructorArgs,
        force: false
      });
      
      results.push(result);
      
      // Add delay between verifications to avoid rate limiting
      if (i < contracts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error: any) {
      
      results.push({
        success: false,
        contractAddress: contract.address,
        networkName: networkName,
        error: error.message
      });
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  
  return results;
}

/**
 * Format verification results for display
 */
export function formatVerificationResults(results: VerificationResult[]): string {
  if (results.length === 1) {
    return formatSingleVerificationResult(results[0]);
  }
  
  return formatBatchVerificationResults(results);
}

/**
 * Format a single verification result
 */
function formatSingleVerificationResult(result: VerificationResult): string {
  const sections = [
    '# 🔍 Contract Verification Result',
    '',
    `**Contract Address:** \`${result.contractAddress}\``,
    `**Network:** ${result.networkName}`,
    `**Status:** ${result.success ? '✅ Verified' : '❌ Failed'}`,
    ''
  ];
  
  if (result.success) {
    if (result.alreadyVerified) {
      sections.push('ℹ️  *Contract was already verified*', '');
    }
    
    if (result.verificationUrl) {
      sections.push(
        '## 🔗 Links',
        `- **Verified Code:** ${result.verificationUrl}`,
        `- **Contract Page:** ${result.explorerUrl}/address/${result.contractAddress}`,
        ''
      );
    }
    
    sections.push(
      '## 📋 Next Steps',
      '1. Review the verified source code',
      '2. Check contract interactions on the explorer',
      '3. Share the verification URL with stakeholders'
    );
  } else {
    sections.push(
      `**Error:** ${result.error}`,
      '',
      '## 🛠️ Troubleshooting',
      '1. Ensure the contract name and constructor arguments are correct',
      '2. Verify the contract was compiled with the same Solidity version',
      '3. Check that all dependencies are available',
      '4. Try again - sometimes explorers have temporary issues'
    );
  }
  
  return sections.join('\n');
}

/**
 * Format batch verification results
 */
function formatBatchVerificationResults(results: VerificationResult[]): string {
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  const sections = [
    `# 🔍 Batch Verification Results (${successCount}/${totalCount})`,
    '',
    '| Contract | Address | Status | Explorer |',
    '|----------|---------|--------|----------|'
  ];
  
  results.forEach(result => {
    const status = result.success ? '✅ Verified' : '❌ Failed';
    const shortAddress = `${result.contractAddress.slice(0, 6)}...${result.contractAddress.slice(-4)}`;
    const explorerLink = result.verificationUrl 
      ? `[View](${result.verificationUrl})`
      : result.explorerUrl 
      ? `[Contract](${result.explorerUrl}/address/${result.contractAddress})`
      : 'N/A';
    
    sections.push(`| ${result.contractAddress} | ${shortAddress} | ${status} | ${explorerLink} |`);
  });
  
  if (results.some(r => !r.success)) {
    sections.push(
      '',
      '## ❌ Failed Verifications',
      ''
    );
    
    results.filter(r => !r.success).forEach(result => {
      sections.push(
        `**${result.contractAddress}:**`,
        `- Error: ${result.error}`,
        ''
      );
    });
  }
  
  return sections.join('\n');
}

/**
 * Check if a contract is already verified
 */
export async function isContractVerified(
  contractAddress: string,
  networkName: string
): Promise<boolean> {
  try {
    const networkConfig = getNetworkConfig(networkName);
    
    if (!networkConfig.explorerApiUrl) {
      return false; // Can't check if no API
    }
    
    // This would require implementing API calls to check verification status
    // For now, return false and let the verification attempt handle it
    return false;
    
  } catch {
    return false;
  }
}