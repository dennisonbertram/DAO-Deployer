import { z } from 'zod';
import { deployContractWithLedger, checkLedgerStatus } from '../utils/ledger.js';
import { getNetworkConfig, resolveNetworkConfig } from '../networks/index.js';
import { loadContractABI, ContractName } from '../utils/contracts.js';
import { FactoryDeploymentConfigSchema, FactoryDeploymentResult, HardwareWalletError } from '../types/index.js';
import { Hex } from 'viem';

// Input validation schema for the deploy-factory tool
export const DeployFactoryInputSchema = FactoryDeploymentConfigSchema;

/**
 * Deploy a DAO factory contract to the specified network
 */
export async function deployFactory(input: z.infer<typeof DeployFactoryInputSchema>): Promise<FactoryDeploymentResult> {
  try {
    // Validate input
    const config = DeployFactoryInputSchema.parse(input);
    
    // Get network configuration
    const networkConfig = await resolveNetworkConfig(getNetworkConfig(config.networkName));
    
    // Determine factory contract to deploy
    const factoryContractName = config.factoryVersion === 'v2' ? 'SimpleDAOFactoryV2' : 'SimpleDAOFactory';
    
    console.log(`\n🏭 Deploying ${factoryContractName} to ${networkConfig.name} (Chain ID: ${networkConfig.chainId})`);
    console.log(`📡 RPC URL: ${networkConfig.rpcUrl.replace(/\/v2\/.*/, '/v2/***')}`); // Hide API keys
    console.log(`💳 Hardware Wallet: ${config.hardwareWalletType || 'None specified'}`);
    console.log(`✅ Verification: ${config.verifyContract ? 'Enabled' : 'Disabled'}`);
    
    // Check hardware wallet connection if required
    if (config.useHardwareWallet && config.hardwareWalletType === 'ledger') {
      console.log('🔍 Checking Ledger device status...');
      const ledgerStatus = await checkLedgerStatus();
      
      if (!ledgerStatus.connected) {
        throw new HardwareWalletError(
          'Ledger device not connected. Please connect and unlock your Ledger device, then open the Ethereum app.'
        );
      }
      
      if (!ledgerStatus.ethereumAppOpen) {
        throw new HardwareWalletError(
          'Ethereum app not open on Ledger device. Please open the Ethereum app on your Ledger.'
        );
      }
      
      console.log(`✅ Ledger connected: ${ledgerStatus.address}`);
    }
    
    // Load contract bytecode
    console.log(`📋 Loading ${factoryContractName} contract...`);
    const contractABI = await loadContractABI(factoryContractName as ContractName);
    
    if (!contractABI.bytecode) {
      throw new Error(`No bytecode found for ${factoryContractName}. Please ensure contracts are compiled.`);
    }
    
    // Deploy the factory contract using Ledger
    const deploymentResult = await deployContractWithLedger({
      networkConfig,
      contractBytecode: contractABI.bytecode as Hex,
      constructorArgs: [], // Factory contracts typically don't need constructor args
      gasEstimateMultiplier: config.gasEstimateMultiplier
    });
    
    // TODO: Implement contract verification if requested
    let verificationStatus: 'verified' | 'pending' | 'failed' | undefined;
    let verificationUrl: string | undefined;
    
    if (config.verifyContract && networkConfig.explorerApiUrl) {
      console.log('⏳ Contract verification not yet implemented with direct Ledger deployment');
      console.log('💡 You can manually verify at:', `${networkConfig.explorerUrl}/address/${deploymentResult.contractAddress}#code`);
      verificationStatus = 'pending';
      verificationUrl = `${networkConfig.explorerUrl}/address/${deploymentResult.contractAddress}#code`;
    }
    
    // Construct result object
    const result: FactoryDeploymentResult = {
      factoryVersion: config.factoryVersion,
      networkName: config.networkName,
      transactionHash: deploymentResult.transactionHash,
      contractAddress: deploymentResult.contractAddress,
      blockNumber: BigInt(0), // TODO: Get block number from transaction receipt
      gasUsed: BigInt(0), // TODO: Get gas used from transaction receipt
      status: 'completed',
      verificationStatus,
      verificationUrl
    };
    
    console.log(`\n🎉 Factory deployment completed successfully!`);
    console.log(`📄 Contract Address: ${result.contractAddress}`);
    console.log(`🔗 Transaction: ${networkConfig.explorerUrl}/tx/${result.transactionHash}`);
    console.log(`⛽ Gas Used: ${result.gasUsed.toLocaleString()}`);
    
    if (result.verificationUrl) {
      console.log(`✅ Verification: ${result.verificationUrl}`);
    }
    
    return result;
    
  } catch (error: any) {
    console.error('❌ Factory deployment failed:', error.message);
    throw error;
  }
}

/**
 * Generate a summary of the factory deployment for display
 */
export function formatFactoryDeploymentSummary(result: FactoryDeploymentResult): string {
  const sections = [
    '# 🏭 Factory Deployment Summary',
    '',
    `**Factory Version:** ${result.factoryVersion.toUpperCase()}`,
    `**Network:** ${result.networkName}`,
    `**Status:** ${result.status}`,
    '',
    '## 📄 Contract Details',
    `- **Address:** \`${result.contractAddress}\``,
    `- **Transaction:** \`${result.transactionHash}\``,
    `- **Block Number:** ${result.blockNumber.toString()}`,
    `- **Gas Used:** ${result.gasUsed.toLocaleString()}`,
    ''
  ];
  
  if (result.verificationStatus) {
    sections.push(
      '## ✅ Verification',
      `- **Status:** ${result.verificationStatus}`,
      result.verificationUrl ? `- **Explorer:** ${result.verificationUrl}` : '',
      ''
    );
  }
  
  sections.push(
    '## 📋 Next Steps',
    '1. Save the factory address for DAO deployments',
    '2. Fund your deployment account for DAO creations',
    '3. Use the `deploy-dao` tool to create DAOs through this factory',
    ''
  );
  
  return sections.filter(line => line !== '').join('\n');
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
  
  // Check hardware wallet configuration
  if (config.useHardwareWallet && !config.hardwareWalletType) {
    issues.push('Hardware wallet type must be specified when useHardwareWallet is true');
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