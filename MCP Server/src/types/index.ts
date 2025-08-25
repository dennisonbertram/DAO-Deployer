import { z } from 'zod';
import { Address } from 'viem';

// Network Configuration Schema
export const NetworkConfigSchema = z.object({
  chainId: z.number(),
  name: z.string(),
  rpcUrl: z.string().url(),
  fallbackRpcUrls: z.array(z.string().url()).optional(),
  explorerUrl: z.string().url().optional(),
  explorerApiUrl: z.string().url().optional(),
  explorerApiKey: z.string().optional(),
  gasMultiplier: z.number().default(1.2),
  maxFeePerGas: z.string().optional(),
  maxPriorityFeePerGas: z.string().optional(),
  nativeCurrency: z.object({
    name: z.string(),
    symbol: z.string(),
    decimals: z.number()
  }),
  testnet: z.boolean().default(false)
});

export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;

// Factory Deployment Configuration Schema
export const FactoryDeploymentConfigSchema = z.object({
  networkName: z.string(),
  factoryVersion: z.enum(['v1', 'v2']).default('v2'),
  verifyContract: z.boolean().default(true),
  gasEstimateMultiplier: z.number().default(1.2),
  fromAddress: z.string().refine((addr) => addr.startsWith('0x') && addr.length === 42, {
    message: "Invalid Ethereum address format"
  }).optional()
});

export type FactoryDeploymentConfig = z.infer<typeof FactoryDeploymentConfigSchema>;

// DAO Deployment Configuration Schema  
export const DAODeploymentConfigSchema = z.object({
  networkName: z.string(),
  factoryAddress: z.string().refine((addr) => addr.startsWith('0x') && addr.length === 42, {
    message: "Invalid Ethereum address format"
  }),
  daoName: z.string().min(1, "DAO name is required"),
  tokenName: z.string().min(1, "Token name is required"),
  tokenSymbol: z.string().min(1, "Token symbol is required").max(10, "Token symbol too long"),
  initialSupply: z.string().regex(/^\d+$/, "Initial supply must be a number"),
  governorSettings: z.object({
    votingDelay: z.number().min(1, "Voting delay must be at least 1 block"),
    votingPeriod: z.number().min(100, "Voting period must be at least 100 blocks"), 
    proposalThreshold: z.string().regex(/^\d+$/, "Proposal threshold must be a number"),
    quorumPercentage: z.number().min(1).max(100, "Quorum must be between 1-100%")
  }),
  timelockSettings: z.object({
    minDelay: z.number().min(0, "Min delay cannot be negative"),
    proposers: z.array(z.string().refine((addr) => addr.startsWith('0x') && addr.length === 42)),
    executors: z.array(z.string().refine((addr) => addr.startsWith('0x') && addr.length === 42))
  }),
  verifyContracts: z.boolean().default(true),
  fromAddress: z.string().refine((addr) => addr.startsWith('0x') && addr.length === 42, {
    message: "Invalid Ethereum address format"
  }).optional()
});

export type DAODeploymentConfig = z.infer<typeof DAODeploymentConfigSchema>;

// Deployment Status Types
export type DeploymentStatus = 
  | 'pending'
  | 'deploying'
  | 'verifying'
  | 'completed'
  | 'failed';

export interface DeploymentResult {
  transactionHash: string;
  contractAddress: Address;
  blockNumber: bigint;
  gasUsed: bigint;
  status: DeploymentStatus;
  error?: string;
  verificationStatus?: 'pending' | 'verified' | 'failed';
  verificationUrl?: string;
}

export interface FactoryDeploymentResult extends DeploymentResult {
  factoryVersion: 'v1' | 'v2';
  networkName: string;
}

export interface DAODeploymentResult {
  daoName: string;
  networkName: string;
  factoryAddress: Address;
  deploymentStatus: DeploymentStatus;
  contracts: {
    token: DeploymentResult;
    governor: DeploymentResult;
    timelock: DeploymentResult;
  };
  totalGasUsed: bigint;
  deploymentStartTime: Date;
  deploymentEndTime?: Date;
}

// Transaction Preparation Types
export interface PreparedTransaction {
  transactionType: 'contract_deployment' | 'contract_call';
  unsignedTransaction: {
    to: string | null;
    value: string;
    data: string;
    gas?: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    nonce?: number;
    chainId?: number;
  };
  metadata: {
    networkName: string;
    networkChainId: number;
    contractName?: string;
    functionName?: string;
    constructorArgs?: any[];
    description: string;
    estimatedGasUsage: string;
    estimatedCostEth: string;
  };
}

export interface TransactionBroadcastInput {
  signedTransaction: string;
  networkName: string;
  expectedTransactionHash?: string;
}

// Contract ABI Types
export interface ContractABI {
  name: string;
  version: string;
  abi: any[];
  bytecode: string;
  deployedBytecode?: string;
  constructorArgs?: any[];
}

// Error Types
export class DAODeployerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'DAODeployerError';
  }
}

export class NetworkError extends DAODeployerError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', context);
  }
}

export class DeploymentError extends DAODeployerError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'DEPLOYMENT_ERROR', context);
  }
}

export class TransactionError extends DAODeployerError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'TRANSACTION_ERROR', context);
  }
}

export class VerificationError extends DAODeployerError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VERIFICATION_ERROR', context);
  }
}