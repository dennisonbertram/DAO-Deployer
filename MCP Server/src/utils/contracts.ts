import fs from 'fs/promises';
import path from 'path';
import { ContractABI } from '../types/index.js';

// Contract file mappings based on the contracts structure we saw
export const CONTRACT_PATHS = {
  // Factory contracts
  'SimpleDAOFactory': 'src/SimpleDAOFactory.sol',
  'SimpleDAOFactoryV2': 'src/SimpleDAOFactoryV2.sol',
  
  // DAO contracts
  'SimpleDAOGovernor': 'src/SimpleDAOGovernor.sol',
  'SimpleDAOGovernorUpgradeable': 'src/SimpleDAOGovernorUpgradeable.sol',
  'SimpleDAOTimelock': 'src/SimpleDAOTimelock.sol',
  'SimpleDAOTimelockUpgradeable': 'src/SimpleDAOTimelockUpgradeable.sol',
  'SimpleDAOTokenUpgradeable': 'src/SimpleDAOTokenUpgradeable.sol',
  'SimpleDAOTokenV2': 'src/SimpleDAOTokenV2.sol'
} as const;

export type ContractName = keyof typeof CONTRACT_PATHS;

// Contracts directory path (relative to MCP Server)
const CONTRACTS_DIR = path.resolve('../contracts');

/**
 * Load contract ABI from compiled JSON
 */
export async function loadContractABI(contractName: ContractName): Promise<ContractABI> {
  try {
    const contractPath = path.join(CONTRACTS_DIR, 'out', `${contractName}.sol`, `${contractName}.json`);
    
    const fileContent = await fs.readFile(contractPath, 'utf-8');
    const contractData = JSON.parse(fileContent);
    
    return {
      name: contractName,
      version: '1.0.0', // Default version
      abi: contractData.abi || [],
      bytecode: contractData.bytecode?.object || contractData.bytecode || '',
      deployedBytecode: contractData.deployedBytecode?.object || contractData.deployedBytecode
    };
  } catch (error: any) {
    throw new Error(`Failed to load contract ABI for ${contractName}: ${error.message}`);
  }
}

/**
 * Load all available contract ABIs
 */
export async function loadAllContractABIs(): Promise<Record<string, ContractABI>> {
  const abis: Record<string, ContractABI> = {};
  
  for (const contractName of Object.keys(CONTRACT_PATHS) as ContractName[]) {
    try {
      abis[contractName] = await loadContractABI(contractName);
    } catch (error) {
      console.warn(`Failed to load ABI for ${contractName}:`, error);
    }
  }
  
  return abis;
}

/**
 * Get the source file path for a contract
 */
export function getContractSourcePath(contractName: ContractName): string {
  const relativePath = CONTRACT_PATHS[contractName];
  if (!relativePath) {
    throw new Error(`Unknown contract: ${contractName}`);
  }
  return relativePath;
}

/**
 * Prepare constructor arguments for factory deployment
 */
export function prepareFactoryConstructorArgs(version: 'v1' | 'v2' = 'v2'): string[] {
  // Factory contracts typically don't require constructor arguments
  // This is where you'd add any initialization parameters if needed
  return [];
}

/**
 * Prepare constructor arguments for DAO token deployment
 */
export function prepareTokenConstructorArgs(config: {
  name: string;
  symbol: string;
  initialSupply: string;
  ownerAddress: string;
}): string[] {
  return [
    config.name,
    config.symbol,
    config.initialSupply,
    config.ownerAddress
  ];
}

/**
 * Prepare constructor arguments for DAO governor deployment
 */
export function prepareGovernorConstructorArgs(config: {
  tokenAddress: string;
  timelockAddress: string;
  votingDelay: number;
  votingPeriod: number;
  proposalThreshold: string;
  quorumPercentage: number;
}): string[] {
  return [
    config.tokenAddress,
    config.timelockAddress,
    config.votingDelay.toString(),
    config.votingPeriod.toString(),
    config.proposalThreshold,
    config.quorumPercentage.toString()
  ];
}

/**
 * Prepare constructor arguments for timelock deployment
 */
export function prepareTimelockConstructorArgs(config: {
  minDelay: number;
  proposers: string[];
  executors: string[];
  admin?: string;
}): string[] {
  // Format arrays as comma-separated strings for Forge
  const proposersStr = config.proposers.length > 0 ? `[${config.proposers.join(',')}]` : '[]';
  const executorsStr = config.executors.length > 0 ? `[${config.executors.join(',')}]` : '[]';
  
  return [
    config.minDelay.toString(),
    proposersStr,
    executorsStr,
    config.admin || '0x0000000000000000000000000000000000000000' // Zero address if no admin
  ];
}

/**
 * Get deployment order for DAO contracts
 * Returns the order in which contracts should be deployed
 */
export function getDAODeploymentOrder(): ContractName[] {
  return [
    'SimpleDAOTokenUpgradeable',    // 1. Deploy token first
    'SimpleDAOTimelockUpgradeable', // 2. Deploy timelock
    'SimpleDAOGovernorUpgradeable'  // 3. Deploy governor last (needs token + timelock addresses)
  ];
}

/**
 * Validate contract exists and is compiled
 */
export async function validateContractExists(contractName: ContractName): Promise<boolean> {
  try {
    const contractPath = path.join(CONTRACTS_DIR, 'out', `${contractName}.sol`, `${contractName}.json`);
    await fs.access(contractPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if contracts are compiled (out directory exists with artifacts)
 */
export async function areContractsCompiled(): Promise<boolean> {
  try {
    const outDir = path.join(CONTRACTS_DIR, 'out');
    const stats = await fs.stat(outDir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get contract deployment gas estimates (rough estimates)
 */
export function getContractGasEstimates(): Record<ContractName, number> {
  return {
    'SimpleDAOFactory': 2_500_000,
    'SimpleDAOFactoryV2': 2_800_000,
    'SimpleDAOGovernor': 3_200_000,
    'SimpleDAOGovernorUpgradeable': 3_500_000,
    'SimpleDAOTimelock': 2_000_000,
    'SimpleDAOTimelockUpgradeable': 2_300_000,
    'SimpleDAOTokenUpgradeable': 2_800_000,
    'SimpleDAOTokenV2': 2_600_000
  };
}

/**
 * Format constructor arguments for display
 */
export function formatConstructorArgsForDisplay(args: string[]): string {
  return args.map((arg, index) => `  ${index + 1}. ${arg}`).join('\n');
}

/**
 * Check if a contract name is a factory contract
 */
export function isFactoryContract(contractName: string): boolean {
  return contractName.toLowerCase().includes('factory');
}

/**
 * Check if a contract name is upgradeable
 */
export function isUpgradeableContract(contractName: string): boolean {
  return contractName.toLowerCase().includes('upgradeable');
}

/**
 * Get recommended contract version based on preferences
 */
export function getRecommendedContractVersion(
  baseContractName: 'governor' | 'timelock' | 'token',
  preferUpgradeable: boolean = true
): ContractName {
  const contractMap: Record<string, { standard: ContractName; upgradeable: ContractName }> = {
    governor: {
      standard: 'SimpleDAOGovernor',
      upgradeable: 'SimpleDAOGovernorUpgradeable'
    },
    timelock: {
      standard: 'SimpleDAOTimelock', 
      upgradeable: 'SimpleDAOTimelockUpgradeable'
    },
    token: {
      standard: 'SimpleDAOTokenV2', // V2 is more recent
      upgradeable: 'SimpleDAOTokenUpgradeable'
    }
  };
  
  const contracts = contractMap[baseContractName];
  if (!contracts) {
    throw new Error(`Unknown base contract: ${baseContractName}`);
  }
  
  return preferUpgradeable ? contracts.upgradeable : contracts.standard;
}