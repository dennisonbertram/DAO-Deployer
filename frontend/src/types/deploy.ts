export interface DAOConfig {
  // Step 1: Basic Information
  name: string;
  description: string;
  tokenName: string;
  tokenSymbol: string;
  initialSupply: string;
  initialRecipient: string;

  // Step 2: Governance Parameters
  votingDelay: number; // in blocks
  votingPeriod: number; // in blocks
  proposalThreshold: string; // in tokens
  quorumPercentage: number; // percentage (1-100)
  timelockDelay: number; // in seconds

  // Step 3: Advanced Settings
  network: string;
  gasOptimization: 'standard' | 'fast' | 'custom';
  customGasPrice?: string;
  enableGaslessVoting: boolean;
  enableTokenBurning: boolean;
  enableTreasuryDiversification: boolean;
}

export interface ValidationError {
  field: keyof DAOConfig;
  message: string;
}

export interface DeploymentStep {
  id: number;
  title: string;
  description: string;
  isComplete: boolean;
  isActive: boolean;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  totalCost: string;
  totalCostUSD: string;
}

export interface DeploymentStatus {
  status: 'idle' | 'preparing' | 'deploying' | 'success' | 'error';
  transactionHash?: string;
  deployedAddresses?: {
    token: string;
    governor: string;
    timelock: string;
  };
  error?: string;
}

export const GOVERNANCE_PRESETS = {
  conservative: {
    name: 'Conservative',
    description: 'High security with long delays - ideal for treasury DAOs',
    votingDelay: 7200, // ~1 day
    votingPeriod: 50400, // ~7 days
    proposalThreshold: '10000', // 10k tokens
    quorumPercentage: 20,
    timelockDelay: 172800, // 2 days
  },
  standard: {
    name: 'Standard',
    description: 'Balanced governance settings for most DAOs',
    votingDelay: 1800, // ~6 hours
    votingPeriod: 25200, // ~3.5 days
    proposalThreshold: '1000', // 1k tokens
    quorumPercentage: 10,
    timelockDelay: 86400, // 1 day
  },
  agile: {
    name: 'Agile',
    description: 'Fast governance for active communities',
    votingDelay: 300, // ~1 hour
    votingPeriod: 7200, // ~1 day
    proposalThreshold: '100', // 100 tokens
    quorumPercentage: 5,
    timelockDelay: 3600, // 1 hour
  },
} as const;

interface NetworkConfig {
  id: string;
  name: string;
  chainId: number;
  currency: string;
  blockTime: number;
  gasPrice: string;
  developmentOnly?: boolean;
}

export const SUPPORTED_NETWORKS: readonly NetworkConfig[] = [
  {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    currency: 'ETH',
    blockTime: 12,
    gasPrice: 'dynamic',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    currency: 'MATIC',
    blockTime: 2,
    gasPrice: 'dynamic',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    currency: 'ETH',
    blockTime: 1,
    gasPrice: 'dynamic',
  },
  {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    currency: 'ETH',
    blockTime: 2,
    gasPrice: 'dynamic',
  },
  {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    currency: 'ETH',
    blockTime: 2,
    gasPrice: 'dynamic',
  },
  {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    chainId: 11155111,
    currency: 'ETH',
    blockTime: 12,
    gasPrice: 'dynamic',
  },
  {
    id: 'localhost',
    name: 'Localhost (Anvil)',
    chainId: 31337,
    currency: 'ETH',
    blockTime: 1,
    gasPrice: 'dynamic',
    developmentOnly: true, // Flag to indicate this should only show in development
  },
] as const;

export type NetworkId = typeof SUPPORTED_NETWORKS[number]['id'];
export type PresetId = keyof typeof GOVERNANCE_PRESETS;