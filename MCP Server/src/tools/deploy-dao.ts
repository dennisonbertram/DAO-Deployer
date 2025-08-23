import { z } from 'zod';
import { deployContractWithLedger, checkLedgerStatus } from '../utils/ledger.js';
import { getNetworkConfig, resolveNetworkConfig } from '../networks/index.js';
import { 
  loadContractABI,
  ContractName,
  prepareTokenConstructorArgs,
  prepareGovernorConstructorArgs,
  prepareTimelockConstructorArgs,
  getDAODeploymentOrder,
  getRecommendedContractVersion
} from '../utils/contracts.js';
import { DAODeploymentConfigSchema, DAODeploymentResult, DeploymentResult, HardwareWalletError } from '../types/index.js';
import { Hex } from 'viem';

// Input validation schema for the deploy-dao tool
export const DeployDAOInputSchema = DAODeploymentConfigSchema;

/**
 * Deploy a complete DAO system through the factory or individually
 */
export async function deployDAO(input: z.infer<typeof DeployDAOInputSchema>): Promise<DAODeploymentResult> {
  try {
    // Validate input
    const config = DeployDAOInputSchema.parse(input);
    
    // Get network configuration
    const networkConfig = await resolveNetworkConfig(getNetworkConfig(config.networkName));
    
    console.log(`\n🏛️ Deploying DAO "${config.daoName}" to ${networkConfig.name}`);
    console.log(`🏭 Factory Address: ${config.factoryAddress}`);
    console.log(`💳 Hardware Wallet: ${config.hardwareWalletType || 'None specified'}`);
    
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
    
    const deploymentStartTime = new Date();
    let totalGasUsed = BigInt(0);
    
    // Deploy contracts in the correct order
    const contracts: DAODeploymentResult['contracts'] = {} as any;
    
    console.log('\n📋 Deploying DAO contracts in order:');
    console.log('1. 🪙 Token Contract');
    console.log('2. ⏰ Timelock Contract');  
    console.log('3. 🏛️ Governor Contract');
    
    // 1. Deploy Token Contract
    console.log('\n🪙 Deploying Token Contract...');
    const tokenContract = getRecommendedContractVersion('token', true);
    const tokenResult = await deployTokenContract(config, networkConfig, tokenContract);
    contracts.token = tokenResult;
    totalGasUsed += tokenResult.gasUsed;
    
    // 2. Deploy Timelock Contract
    console.log('\n⏰ Deploying Timelock Contract...');
    const timelockContract = getRecommendedContractVersion('timelock', true);
    const timelockResult = await deployTimelockContract(config, networkConfig, timelockContract);
    contracts.timelock = timelockResult;
    totalGasUsed += timelockResult.gasUsed;
    
    // 3. Deploy Governor Contract  
    console.log('\n🏛️ Deploying Governor Contract...');
    const governorContract = getRecommendedContractVersion('governor', true);
    const governorResult = await deployGovernorContract(
      config,
      networkConfig,
      governorContract,
      tokenResult.contractAddress,
      timelockResult.contractAddress
    );
    contracts.governor = governorResult;
    totalGasUsed += governorResult.gasUsed;
    
    const deploymentEndTime = new Date();
    
    const result: DAODeploymentResult = {
      daoName: config.daoName,
      networkName: config.networkName,
      factoryAddress: config.factoryAddress as `0x${string}`,
      deploymentStatus: 'completed',
      contracts,
      totalGasUsed,
      deploymentStartTime,
      deploymentEndTime
    };
    
    console.log(`\n🎉 DAO deployment completed successfully!`);
    console.log(`⏱️  Total deployment time: ${Math.round((deploymentEndTime.getTime() - deploymentStartTime.getTime()) / 1000)}s`);
    console.log(`⛽ Total gas used: ${totalGasUsed.toLocaleString()}`);
    console.log(`\n📄 Deployed Contracts:`);
    console.log(`   🪙 Token: ${contracts.token.contractAddress}`);
    console.log(`   ⏰ Timelock: ${contracts.timelock.contractAddress}`);
    console.log(`   🏛️ Governor: ${contracts.governor.contractAddress}`);
    
    return result;
    
  } catch (error: any) {
    console.error('❌ DAO deployment failed:', error.message);
    throw error;
  }
}

/**
 * Deploy the token contract for the DAO
 */
async function deployTokenContract(
  config: z.infer<typeof DeployDAOInputSchema>,
  networkConfig: any,
  contractName: string
): Promise<DeploymentResult> {
  
  // Load contract bytecode
  console.log(`📝 Loading ${contractName} contract...`);
  const contractABI = await loadContractABI(contractName as ContractName);
  
  if (!contractABI.bytecode) {
    throw new Error(`No bytecode found for ${contractName}. Please ensure contracts are compiled.`);
  }
  
  // For upgradeable contracts, we need to deploy with initialization parameters
  const constructorArgs = [
    config.tokenName,
    config.tokenSymbol,
    config.initialSupply
  ];
  
  // Deploy using Ledger
  const deploymentResult = await deployContractWithLedger({
    networkConfig,
    contractBytecode: contractABI.bytecode as Hex,
    constructorArgs,
    gasEstimateMultiplier: 1.2
  });
  
  return {
    transactionHash: deploymentResult.transactionHash,
    contractAddress: deploymentResult.contractAddress,
    blockNumber: BigInt(0), // TODO: Get from transaction receipt
    gasUsed: BigInt(0), // TODO: Get from transaction receipt
    status: 'completed',
    verificationStatus: config.verifyContracts ? 'pending' : undefined
  };
}

/**
 * Deploy the timelock contract for the DAO
 */
async function deployTimelockContract(
  config: z.infer<typeof DeployDAOInputSchema>,
  networkConfig: any,
  contractName: string
): Promise<DeploymentResult> {
  
  // Load contract bytecode
  console.log(`📝 Loading ${contractName} contract...`);
  const contractABI = await loadContractABI(contractName as ContractName);
  
  if (!contractABI.bytecode) {
    throw new Error(`No bytecode found for ${contractName}. Please ensure contracts are compiled.`);
  }
  
  const constructorArgs = prepareTimelockConstructorArgs({
    minDelay: config.timelockSettings.minDelay,
    proposers: config.timelockSettings.proposers,
    executors: config.timelockSettings.executors
  });
  
  // Deploy using Ledger
  const deploymentResult = await deployContractWithLedger({
    networkConfig,
    contractBytecode: contractABI.bytecode as Hex,
    constructorArgs,
    gasEstimateMultiplier: 1.2
  });
  
  return {
    transactionHash: deploymentResult.transactionHash,
    contractAddress: deploymentResult.contractAddress,
    blockNumber: BigInt(0), // TODO: Get from transaction receipt
    gasUsed: BigInt(0), // TODO: Get from transaction receipt
    status: 'completed',
    verificationStatus: config.verifyContracts ? 'pending' : undefined
  };
}

/**
 * Deploy the governor contract for the DAO
 */
async function deployGovernorContract(
  config: z.infer<typeof DeployDAOInputSchema>,
  networkConfig: any,
  contractName: string,
  tokenAddress: string,
  timelockAddress: string
): Promise<DeploymentResult> {
  
  // Load contract bytecode
  console.log(`📝 Loading ${contractName} contract...`);
  const contractABI = await loadContractABI(contractName as ContractName);
  
  if (!contractABI.bytecode) {
    throw new Error(`No bytecode found for ${contractName}. Please ensure contracts are compiled.`);
  }
  
  const constructorArgs = prepareGovernorConstructorArgs({
    tokenAddress,
    timelockAddress,
    votingDelay: config.governorSettings.votingDelay,
    votingPeriod: config.governorSettings.votingPeriod,
    proposalThreshold: config.governorSettings.proposalThreshold,
    quorumPercentage: config.governorSettings.quorumPercentage
  });
  
  // Deploy using Ledger
  const deploymentResult = await deployContractWithLedger({
    networkConfig,
    contractBytecode: contractABI.bytecode as Hex,
    constructorArgs,
    gasEstimateMultiplier: 1.2
  });
  
  return {
    transactionHash: deploymentResult.transactionHash,
    contractAddress: deploymentResult.contractAddress,
    blockNumber: BigInt(0), // TODO: Get from transaction receipt
    gasUsed: BigInt(0), // TODO: Get from transaction receipt
    status: 'completed',
    verificationStatus: config.verifyContracts ? 'pending' : undefined
  };
}

/**
 * Generate a summary of the DAO deployment for display
 */
export function formatDAODeploymentSummary(result: DAODeploymentResult): string {
  const deploymentTime = result.deploymentEndTime && result.deploymentStartTime
    ? Math.round((result.deploymentEndTime.getTime() - result.deploymentStartTime.getTime()) / 1000)
    : 0;
    
  const sections = [
    `# 🏛️ DAO Deployment Summary: "${result.daoName}"`,
    '',
    `**Network:** ${result.networkName}`,
    `**Status:** ${result.deploymentStatus}`,
    `**Total Gas Used:** ${result.totalGasUsed.toLocaleString()}`,
    `**Deployment Time:** ${deploymentTime}s`,
    '',
    '## 📄 Deployed Contracts',
    '',
    '### 🪙 Token Contract',
    `- **Address:** \`${result.contracts.token.contractAddress}\``,
    `- **Transaction:** \`${result.contracts.token.transactionHash}\``,
    `- **Gas Used:** ${result.contracts.token.gasUsed.toLocaleString()}`,
    '',
    '### ⏰ Timelock Contract',
    `- **Address:** \`${result.contracts.timelock.contractAddress}\``,
    `- **Transaction:** \`${result.contracts.timelock.transactionHash}\``,
    `- **Gas Used:** ${result.contracts.timelock.gasUsed.toLocaleString()}`,
    '',
    '### 🏛️ Governor Contract',
    `- **Address:** \`${result.contracts.governor.contractAddress}\``,
    `- **Transaction:** \`${result.contracts.governor.transactionHash}\``,
    `- **Gas Used:** ${result.contracts.governor.gasUsed.toLocaleString()}`,
    ''
  ];
  
  if (result.contracts.token.verificationStatus) {
    sections.push(
      '## ✅ Verification Status',
      `- **Token:** ${result.contracts.token.verificationStatus}`,
      `- **Timelock:** ${result.contracts.timelock.verificationStatus}`,
      `- **Governor:** ${result.contracts.governor.verificationStatus}`,
      ''
    );
  }
  
  sections.push(
    '## 📋 Next Steps',
    '1. Configure governance parameters',
    '2. Set up token distribution',
    '3. Create initial proposals',
    '4. Engage community members',
    '',
    '## 🔗 Important Addresses',
    `**Governor (Main DAO):** \`${result.contracts.governor.contractAddress}\``,
    `**Token (Voting Power):** \`${result.contracts.token.contractAddress}\``,
    `**Timelock (Treasury):** \`${result.contracts.timelock.contractAddress}\``
  );
  
  return sections.join('\n');
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
  
  // Validate factory address format
  if (!config.factoryAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    issues.push('Invalid factory address format');
  }
  
  // Validate token settings
  if (config.tokenSymbol.length > 10) {
    issues.push('Token symbol too long (max 10 characters)');
  }
  
  // Validate governance settings
  if (config.governorSettings.quorumPercentage < 1 || config.governorSettings.quorumPercentage > 100) {
    issues.push('Quorum percentage must be between 1-100%');
  }
  
  // Validate timelock proposers and executors
  const invalidAddresses = [...config.timelockSettings.proposers, ...config.timelockSettings.executors]
    .filter(addr => !addr.match(/^0x[a-fA-F0-9]{40}$/));
  
  if (invalidAddresses.length > 0) {
    issues.push(`Invalid addresses in timelock settings: ${invalidAddresses.join(', ')}`);
  }
  
  // Check hardware wallet configuration
  if (config.useHardwareWallet && !config.hardwareWalletType) {
    issues.push('Hardware wallet type must be specified when useHardwareWallet is true');
  }
  
  return issues;
}