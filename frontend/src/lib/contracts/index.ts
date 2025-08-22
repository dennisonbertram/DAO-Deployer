// Main contracts module exports
export * from './addresses';
export * from './abis';
export * from './types';

// Re-export commonly used VIEM types for convenience
export type { Address, Hash, Hex } from 'viem';

// Contract interaction constants
export const BLOCK_TIME = {
  ETHEREUM: 12, // seconds
  POLYGON: 2,
  ARBITRUM: 0.25,
  OPTIMISM: 2,
  BASE: 2,
} as const;

// Common governance parameter presets
export const GOVERNANCE_PRESETS = {
  CONSERVATIVE: {
    name: 'Conservative',
    description: 'Long delays and high thresholds for treasury DAOs',
    votingDelay: '7200', // ~1 day on Ethereum
    votingPeriod: '50400', // ~7 days on Ethereum
    proposalThreshold: '1000',
    quorumPercentage: '10',
    timelockDelay: '86400', // 1 day
  },
  STANDARD: {
    name: 'Standard',
    description: 'Balanced settings for most DAOs',
    votingDelay: '1800', // ~4 hours on Ethereum
    votingPeriod: '21600', // ~3 days on Ethereum
    proposalThreshold: '100',
    quorumPercentage: '4',
    timelockDelay: '21600', // 6 hours
  },
  AGILE: {
    name: 'Agile',
    description: 'Short delays and low thresholds for active communities',
    votingDelay: '900', // ~2 hours on Ethereum
    votingPeriod: '10800', // ~1.5 days on Ethereum
    proposalThreshold: '10',
    quorumPercentage: '1',
    timelockDelay: '3600', // 1 hour
  },
} as const;

// Default values for deployment
export const DEPLOYMENT_DEFAULTS = {
  initialSupply: '1000000', // 1M tokens
  votingDelay: GOVERNANCE_PRESETS.STANDARD.votingDelay,
  votingPeriod: GOVERNANCE_PRESETS.STANDARD.votingPeriod,
  proposalThreshold: GOVERNANCE_PRESETS.STANDARD.proposalThreshold,
  quorumPercentage: GOVERNANCE_PRESETS.STANDARD.quorumPercentage,
  timelockDelay: GOVERNANCE_PRESETS.STANDARD.timelockDelay,
} as const;

// Gas limits for different operations (estimated)
export const GAS_LIMITS = {
  DEPLOY_DAO: BigInt(2000000),
  CREATE_PROPOSAL: BigInt(200000),
  CAST_VOTE: BigInt(100000),
  DELEGATE_VOTES: BigInt(80000),
  EXECUTE_PROPOSAL: BigInt(300000),
} as const;

// Error messages for user-friendly display
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet to continue',
  INSUFFICIENT_BALANCE: 'Insufficient balance for this transaction',
  INVALID_ADDRESS: 'Invalid address format',
  NETWORK_NOT_SUPPORTED: 'This network is not supported',
  TRANSACTION_FAILED: 'Transaction failed. Please try again',
  PROPOSAL_NOT_FOUND: 'Proposal not found',
  VOTING_PERIOD_ENDED: 'Voting period has ended',
  INSUFFICIENT_VOTING_POWER: 'Insufficient voting power to create proposal',
} as const;