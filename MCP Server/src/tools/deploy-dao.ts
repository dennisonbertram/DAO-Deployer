import { z } from 'zod';
import { getNetworkConfig, resolveNetworkConfig } from '../networks/index.js';
import { 
  loadContractABI,
  ContractName,
  prepareTokenConstructorArgs,
  prepareGovernorConstructorArgs,
  prepareTimelockConstructorArgs,
  getRecommendedContractVersion
} from '../utils/contracts.js';
import { prepareContractDeployment } from '../utils/transactions.js';
import { DAODeploymentConfigSchema, PreparedTransaction, TransactionError } from '../types/index.js';
import { Address, Hex } from 'viem';

// Input validation schema for the deploy-dao tool
export const DeployDAOInputSchema = DAODeploymentConfigSchema;

/**
 * Deployment order for DAO contracts
 */
export interface DAODeploymentPlan {
  step1_token: PreparedTransaction;
  step2_timelock: PreparedTransaction;
  step3_governor: PreparedTransaction;
  metadata: {
    daoName: string;
    networkName: string;
    factoryAddress: string;
    totalEstimatedCost: string;
    deploymentOrder: string[];
  };
}

/**
 * Prepare complete DAO deployment plan with all transactions
 */
export async function prepareDAODeploymentPlan(input: z.infer<typeof DeployDAOInputSchema>): Promise<DAODeploymentPlan> {
  try {
    // Validate input
    const config = DeployDAOInputSchema.parse(input);
    
    // Get network configuration
    const networkConfig = await resolveNetworkConfig(getNetworkConfig(config.networkName));
    
    
    const deploymentOrder = ['Token Contract', 'Timelock Contract', 'Governor Contract'];
    deploymentOrder.forEach((contract, index) => {
    });
    
    // Step 1: Prepare Token Contract Deployment
    const tokenContract = getRecommendedContractVersion('token', true);
    const tokenTransaction = await prepareTokenDeployment(config, networkConfig, tokenContract);
    
    // Step 2: Prepare Timelock Contract Deployment  
    const timelockContract = getRecommendedContractVersion('timelock', true);
    const timelockTransaction = await prepareTimelockDeployment(config, networkConfig, timelockContract);
    
    // Step 3: Prepare Governor Contract Deployment
    const governorContract = getRecommendedContractVersion('governor', true);
    const governorTransaction = await prepareGovernorDeployment(config, networkConfig, governorContract);
    
    // Calculate total estimated cost
    const totalCostEth = [tokenTransaction, timelockTransaction, governorTransaction]
      .reduce((sum, tx) => sum + parseFloat(tx.metadata.estimatedCostEth), 0)
      .toFixed(6);
    
    const deploymentPlan: DAODeploymentPlan = {
      step1_token: tokenTransaction,
      step2_timelock: timelockTransaction, 
      step3_governor: governorTransaction,
      metadata: {
        daoName: config.daoName,
        networkName: config.networkName,
        factoryAddress: config.factoryAddress,
        totalEstimatedCost: totalCostEth,
        deploymentOrder
      }
    };
    
    
    
    return deploymentPlan;
    
  } catch (error: any) {
    throw error;
  }
}

/**
 * Prepare token contract deployment transaction
 */
async function prepareTokenDeployment(
  config: z.infer<typeof DeployDAOInputSchema>,
  networkConfig: any,
  contractName: string
): Promise<PreparedTransaction> {
  
  // Load contract bytecode
  const contractABI = await loadContractABI(contractName as ContractName);
  
  if (!contractABI.bytecode) {
    throw new TransactionError(`No bytecode found for ${contractName}. Please ensure contracts are compiled.`);
  }
  
  const constructorArgs = prepareTokenConstructorArgs({
    name: config.tokenName,
    symbol: config.tokenSymbol,
    initialSupply: config.initialSupply,
    ownerAddress: config.fromAddress || '0x0000000000000000000000000000000000000000'
  });
  
  return await prepareContractDeployment({
    networkConfig,
    contractBytecode: contractABI.bytecode as Hex,
    constructorArgs,
    gasEstimateMultiplier: 1.2,
    fromAddress: config.fromAddress as Address,
    contractName
  });
}

/**
 * Prepare timelock contract deployment transaction
 */
async function prepareTimelockDeployment(
  config: z.infer<typeof DeployDAOInputSchema>,
  networkConfig: any,
  contractName: string
): Promise<PreparedTransaction> {
  
  // Load contract bytecode
  const contractABI = await loadContractABI(contractName as ContractName);
  
  if (!contractABI.bytecode) {
    throw new TransactionError(`No bytecode found for ${contractName}. Please ensure contracts are compiled.`);
  }
  
  const constructorArgs = prepareTimelockConstructorArgs({
    minDelay: config.timelockSettings.minDelay,
    proposers: config.timelockSettings.proposers,
    executors: config.timelockSettings.executors
  });
  
  return await prepareContractDeployment({
    networkConfig,
    contractBytecode: contractABI.bytecode as Hex,
    constructorArgs,
    gasEstimateMultiplier: 1.2,
    fromAddress: config.fromAddress as Address,
    contractName
  });
}

/**
 * Prepare governor contract deployment transaction
 * Note: This generates a template that needs token and timelock addresses filled in
 */
async function prepareGovernorDeployment(
  config: z.infer<typeof DeployDAOInputSchema>,
  networkConfig: any,
  contractName: string
): Promise<PreparedTransaction> {
  
  // Load contract bytecode
  const contractABI = await loadContractABI(contractName as ContractName);
  
  if (!contractABI.bytecode) {
    throw new TransactionError(`No bytecode found for ${contractName}. Please ensure contracts are compiled.`);
  }
  
  // Use placeholder addresses - these need to be updated after deploying token and timelock
  const PLACEHOLDER_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000001";
  const PLACEHOLDER_TIMELOCK_ADDRESS = "0x0000000000000000000000000000000000000002";
  
  const constructorArgs = prepareGovernorConstructorArgs({
    tokenAddress: PLACEHOLDER_TOKEN_ADDRESS,
    timelockAddress: PLACEHOLDER_TIMELOCK_ADDRESS,
    votingDelay: config.governorSettings.votingDelay,
    votingPeriod: config.governorSettings.votingPeriod,
    proposalThreshold: config.governorSettings.proposalThreshold,
    quorumPercentage: config.governorSettings.quorumPercentage
  });
  
  const preparedTx = await prepareContractDeployment({
    networkConfig,
    contractBytecode: contractABI.bytecode as Hex,
    constructorArgs,
    gasEstimateMultiplier: 1.2,
    fromAddress: config.fromAddress as Address,
    contractName
  });
  
  // Add warning about placeholder addresses
  preparedTx.metadata.description += ' ⚠️ REQUIRES UPDATING: Replace placeholder addresses with actual token and timelock addresses';
  
  return preparedTx;
}

/**
 * Generate detailed deployment instructions
 */
export function generateDAODeploymentInstructions(plan: DAODeploymentPlan): string {
  const sections = [
    '# 🏛️ DAO Deployment Instructions',
    '',
    `**DAO Name:** ${plan.metadata.daoName}`,
    `**Network:** ${plan.metadata.networkName}`,
    `**Factory:** ${plan.metadata.factoryAddress}`,
    `**Total Estimated Cost:** ${plan.metadata.totalEstimatedCost} ETH`,
    '',
    '## 🚨 IMPORTANT: Sequential Deployment Required',
    '',
    '⚠️ **Address Dependencies**: These contracts must be deployed in order because:',
    '- Governor contract needs the Token contract address',
    '- Governor contract needs the Timelock contract address',
    '',
    '## 📋 Step-by-Step Process',
    '',
    '### Step 1: Deploy Token Contract 🪙',
    '',
    '**Transaction Details:**',
    `- Contract: ${plan.step1_token.metadata.contractName}`,
    `- Estimated Gas: ${plan.step1_token.metadata.estimatedGasUsage.toLocaleString()}`,
    `- Estimated Cost: ${plan.step1_token.metadata.estimatedCostEth} ETH`,
    '',
    '**Process:**',
    '1. Sign and broadcast the token deployment transaction using your MCP Ledger server',
    '2. Wait for transaction confirmation',
    '3. **SAVE THE TOKEN CONTRACT ADDRESS** - you will need it for Step 3',
    '',
    '### Step 2: Deploy Timelock Contract ⏰',
    '',
    '**Transaction Details:**',
    `- Contract: ${plan.step2_timelock.metadata.contractName}`,
    `- Estimated Gas: ${plan.step2_timelock.metadata.estimatedGasUsage.toLocaleString()}`,
    `- Estimated Cost: ${plan.step2_timelock.metadata.estimatedCostEth} ETH`,
    '',
    '**Process:**',
    '1. Sign and broadcast the timelock deployment transaction using your MCP Ledger server',
    '2. Wait for transaction confirmation',
    '3. **SAVE THE TIMELOCK CONTRACT ADDRESS** - you will need it for Step 3',
    '',
    '### Step 3: Deploy Governor Contract 🏛️',
    '',
    '**Transaction Details:**',
    `- Contract: ${plan.step3_governor.metadata.contractName}`,
    `- Estimated Gas: ${plan.step3_governor.metadata.estimatedGasUsage.toLocaleString()}`,
    `- Estimated Cost: ${plan.step3_governor.metadata.estimatedCostEth} ETH`,
    '',
    '**⚠️ CRITICAL: Update Transaction Before Signing**',
    '',
    'The governor transaction contains placeholder addresses that must be replaced:',
    '```',
    'Replace: 0x0000000000000000000000000000000000000001',
    'With:    [Your Token Contract Address from Step 1]',
    '',
    'Replace: 0x0000000000000000000000000000000000000002', 
    'With:    [Your Timelock Contract Address from Step 2]',
    '```',
    '',
    '**Process:**',
    '1. Update the transaction data with real token and timelock addresses',
    '2. Sign and broadcast the updated governor transaction using your MCP Ledger server',  
    '3. Wait for transaction confirmation',
    '4. **SAVE THE GOVERNOR CONTRACT ADDRESS** - this is your main DAO contract',
    '',
    '## ✅ Post-Deployment Steps',
    '',
    '1. **Verify Contracts** (if enabled)',
    '   - Use the verify-contract tool for each deployed contract',
    '',
    '2. **Set Up Governance**',
    '   - Token holders can now create and vote on proposals',
    '   - Proposals are executed through the timelock for security',
    '',
    '3. **Save Contract Addresses**',
    '   - Token: `[Address from Step 1]`',
    '   - Timelock: `[Address from Step 2]`', 
    '   - Governor: `[Address from Step 3]`',
    '',
    '## 🔧 Technical Notes',
    '',
    '**Transaction Preparation Only**: This tool only prepares transactions for signing.',
    'You must use your MCP Ledger server for signing and broadcasting.',
    '',
    '**Address Dependencies**: The governor contract constructor requires both',
    'token and timelock addresses, which is why they must be deployed first.',
    '',
    '**Gas Estimates**: All gas estimates include a 20% buffer for safety.',
    `**Total Cost**: Approximately ${plan.metadata.totalEstimatedCost} ETH plus any failed transaction costs.`,
    ''
  ];
  
  return sections.join('\n');
}

/**
 * Update governor transaction with real addresses
 */
export function updateGovernorTransaction(
  governorTx: PreparedTransaction,
  tokenAddress: string,
  timelockAddress: string
): PreparedTransaction {
  
  if (!tokenAddress.startsWith('0x') || tokenAddress.length !== 42) {
    throw new TransactionError('Invalid token address format');
  }
  
  if (!timelockAddress.startsWith('0x') || timelockAddress.length !== 42) {
    throw new TransactionError('Invalid timelock address format');
  }
  
  // Update the transaction data by replacing placeholder addresses
  let updatedData = governorTx.unsignedTransaction.data;
  
  // Replace placeholders with actual addresses (remove 0x prefix for replacement)
  updatedData = updatedData.replace(
    '0000000000000000000000000000000000000001',
    tokenAddress.slice(2)
  ) as Hex;
  
  updatedData = updatedData.replace(
    '0000000000000000000000000000000000000002',
    timelockAddress.slice(2)
  ) as Hex;
  
  return {
    ...governorTx,
    unsignedTransaction: {
      ...governorTx.unsignedTransaction,
      data: updatedData
    },
    metadata: {
      ...governorTx.metadata,
      description: governorTx.metadata.description.replace(' ⚠️ REQUIRES UPDATING: Replace placeholder addresses with actual token and timelock addresses', ' ✅ Updated with real token and timelock addresses')
    }
  };
}

/**
 * Get DAO deployment summary
 */
export function getDAODeploymentSummary(plan: DAODeploymentPlan): string {
  return `🏛️ DAO Deployment Summary

DAO Name: ${plan.metadata.daoName}
Network: ${plan.metadata.networkName}
Factory: ${plan.metadata.factoryAddress}

Contracts to Deploy:
1. 🪙 ${plan.step1_token.metadata.contractName} (${plan.step1_token.metadata.estimatedCostEth} ETH)
2. ⏰ ${plan.step2_timelock.metadata.contractName} (${plan.step2_timelock.metadata.estimatedCostEth} ETH)  
3. 🏛️ ${plan.step3_governor.metadata.contractName} (${plan.step3_governor.metadata.estimatedCostEth} ETH)

Total Estimated Cost: ${plan.metadata.totalEstimatedCost} ETH

⚠️  Sequential deployment required - see instructions for details`;
}

/**
 * Validate DAO deployment prerequisites
 */
export async function validateDAODeploymentPrerequisites(config: z.infer<typeof DeployDAOInputSchema>): Promise<string[]> {
  const issues: string[] = [];
  
  // Check if network is supported
  try {
    getNetworkConfig(config.networkName);
  } catch {
    issues.push(`Unsupported network: ${config.networkName}`);
  }
  
  // Check factory address format
  if (!config.factoryAddress.startsWith('0x') || config.factoryAddress.length !== 42) {
    issues.push('Factory address must be a valid Ethereum address format');
  }
  
  // Check from address format if provided
  if (config.fromAddress && (!config.fromAddress.startsWith('0x') || config.fromAddress.length !== 42)) {
    issues.push('fromAddress must be a valid Ethereum address format (0x...)');
  }
  
  // Validate proposer and executor addresses
  for (const proposer of config.timelockSettings.proposers) {
    if (!proposer.startsWith('0x') || proposer.length !== 42) {
      issues.push(`Invalid proposer address format: ${proposer}`);
    }
  }
  
  for (const executor of config.timelockSettings.executors) {
    if (!executor.startsWith('0x') || executor.length !== 42) {
      issues.push(`Invalid executor address format: ${executor}`);
    }
  }
  
  // Validate numeric fields
  if (config.governorSettings.quorumPercentage < 1 || config.governorSettings.quorumPercentage > 100) {
    issues.push('Quorum percentage must be between 1 and 100');
  }
  
  if (config.governorSettings.votingDelay < 1) {
    issues.push('Voting delay must be at least 1 block');
  }
  
  if (config.governorSettings.votingPeriod < 100) {
    issues.push('Voting period should be at least 100 blocks for security');
  }
  
  return issues;
}