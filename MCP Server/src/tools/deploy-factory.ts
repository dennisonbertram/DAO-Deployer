import { z } from 'zod';
import { getNetworkConfig, resolveNetworkConfig } from '../networks/index.js';
import { loadContractABI, ContractName } from '../utils/contracts.js';
import { prepareContractDeployment } from '../utils/transactions.js';
import { FactoryDeploymentConfigSchema, PreparedTransaction, TransactionError } from '../types/index.js';
import { Address, Hex } from 'viem';

// Input validation schema for the deploy-factory tool
export const DeployFactoryInputSchema = FactoryDeploymentConfigSchema;

/**
 * Prepare factory deployment transaction for external signing
 */
export async function prepareFactoryDeployment(input: z.infer<typeof DeployFactoryInputSchema>): Promise<PreparedTransaction> {
  try {
    // Validate input
    const config = DeployFactoryInputSchema.parse(input);
    
    // Get network configuration
    const networkConfig = await resolveNetworkConfig(getNetworkConfig(config.networkName));
    
    // Determine factory contract to deploy
    const factoryContractName = config.factoryVersion === 'v2' ? 'SimpleDAOFactoryV2' : 'SimpleDAOFactory';
    
    // Preparing factory deployment
    // RPC URL configured
    // Contract verification configured
    
    // Load contract bytecode
    // Loading factory contract
    const contractABI = await loadContractABI(factoryContractName as ContractName);
    
    if (!contractABI.bytecode) {
      throw new TransactionError(`No bytecode found for ${factoryContractName}. Please ensure contracts are compiled.`);
    }
    
    // Prepare the deployment transaction
    const preparedTransaction = await prepareContractDeployment({
      networkConfig,
      contractBytecode: contractABI.bytecode as Hex,
      constructorArgs: [], // Factory contracts typically don't need constructor args
      gasEstimateMultiplier: config.gasEstimateMultiplier,
      fromAddress: config.fromAddress as Address,
      contractName: factoryContractName
    });
    
    
    if (config.verifyContract && networkConfig.explorerApiUrl) {
    } else {
    }
    
    return preparedTransaction;
    
  } catch (error: any) {
    throw error;
  }
}

/**
 * Generate deployment instructions for the user
 */
export function generateFactoryDeploymentInstructions(
  preparedTx: PreparedTransaction,
  config: z.infer<typeof DeployFactoryInputSchema>
): string {
  const sections = [
    '# 🏭 Factory Deployment Instructions',
    '',
    `**Factory Version:** ${config.factoryVersion.toUpperCase()}`,
    `**Network:** ${preparedTx.metadata.networkName}`,
    `**Contract:** ${preparedTx.metadata.contractName}`,
    '',
    '## 🔧 Transaction Details',
    '',
    '```json',
    JSON.stringify({
      to: preparedTx.unsignedTransaction.to,
      value: preparedTx.unsignedTransaction.value,
      data: preparedTx.unsignedTransaction.data.slice(0, 100) + '...',
      gas: preparedTx.unsignedTransaction.gas?.toString(),
      gasPrice: preparedTx.unsignedTransaction.gasPrice?.toString(),
      chainId: preparedTx.unsignedTransaction.chainId
    }, null, 2),
    '```',
    '',
    '## 💰 Cost Estimation',
    `- **Gas Limit:** ${preparedTx.metadata.estimatedGasUsage.toLocaleString()}`,
    `- **Gas Price:** ${preparedTx.unsignedTransaction.gasPrice ? (Number(preparedTx.unsignedTransaction.gasPrice) / 1e9).toFixed(2) + ' gwei' : 'Dynamic'}`,
    `- **Estimated Cost:** ${preparedTx.metadata.estimatedCostEth} ETH`,
    '',
    '## 📋 Deployment Process',
    '',
    '### Step 1: Sign Transaction with MCP Ledger Server',
    '```bash',
    '# Use your MCP Ledger server to sign this transaction',
    '# The server will handle the signing process securely',
    '```',
    '',
    '### Step 2: Broadcast Transaction',
    '```bash',
    '# After signing, broadcast the transaction to the network',
    '# The MCP Ledger server can also handle broadcasting',
    '```',
    '',
    '### Step 3: Verify Deployment',
    '```bash',
    '# Once confirmed, verify the contract (if enabled)',
    '# Use the verify-contract tool with the deployed address',
    '```',
    ''
  ];
  
  if (config.verifyContract) {
    sections.push(
      '## ✅ Verification Setup',
      `- **Block Explorer:** Available for ${preparedTx.metadata.networkName}`,
      '- **Auto-verification:** Use verify-contract tool after deployment',
      '- **Manual verification:** Check block explorer after deployment',
      ''
    );
  }
  
  sections.push(
    '## 🚨 Important Notes',
    '',
    '⚠️ **Transaction Preparation Only**',
    'This tool prepares the deployment transaction but does not execute it.',
    'You must use your MCP Ledger server to sign and broadcast the transaction.',
    '',
    '⚠️ **Save Factory Address**',  
    'After successful deployment, save the factory contract address.',
    'You will need it for deploying DAOs using the deploy-dao tool.',
    '',
    '⚠️ **Network Fees**',
    'Ensure your account has sufficient native tokens for gas fees.',
    `Current estimate: ${preparedTx.metadata.estimatedCostEth} ETH`,
    ''
  );
  
  return sections.join('\n');
}

/**
 * Validate factory deployment prerequisites  
 */
export async function validateFactoryDeploymentPrerequisites(config: z.infer<typeof DeployFactoryInputSchema>): Promise<string[]> {
  const issues: string[] = [];
  
  // Check if network is supported
  try {
    getNetworkConfig(config.networkName);
  } catch {
    issues.push(`Unsupported network: ${config.networkName}`);
  }
  
  // Check from address format if provided
  if (config.fromAddress && (!config.fromAddress.startsWith('0x') || config.fromAddress.length !== 42)) {
    issues.push('fromAddress must be a valid Ethereum address format (0x...)');
  }
  
  // Check verification prerequisites
  if (config.verifyContract) {
    const networkConfig = getNetworkConfig(config.networkName);
    if (!networkConfig.explorerApiUrl) {
      issues.push(`Contract verification not available for network: ${config.networkName}`);
    }
  }
  
  return issues;
}

/**
 * Get factory deployment summary for display
 */
export function getFactoryDeploymentSummary(
  preparedTx: PreparedTransaction,
  config: z.infer<typeof DeployFactoryInputSchema>
): string {
  return `🏭 Factory Deployment Summary
  
Contract: ${preparedTx.metadata.contractName}
Version: ${config.factoryVersion.toUpperCase()}
Network: ${preparedTx.metadata.networkName} (Chain ID: ${preparedTx.metadata.networkChainId})
Estimated Gas: ${preparedTx.metadata.estimatedGasUsage.toLocaleString()}
Estimated Cost: ${preparedTx.metadata.estimatedCostEth} ETH
Verification: ${config.verifyContract ? 'Enabled' : 'Disabled'}

⚠️  Transaction prepared - use MCP Ledger server for signing and broadcasting`;
}