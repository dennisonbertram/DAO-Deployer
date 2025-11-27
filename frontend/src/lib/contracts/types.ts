// Contract types for DAO Deployer
import { Address } from 'viem';

// DAO Configuration structure for deployment
export interface DAOConfig {
  tokenName: string;
  tokenSymbol: string;
  initialSupply: bigint;
  votingDelay: bigint;
  votingPeriod: bigint;
  proposalThreshold: bigint;
  quorumPercentage: bigint;
  timelockDelay: bigint;
}

// Deployed DAO information structure
export interface DeployedDAO {
  token: Address;
  governor: Address;
  timelock: Address;
  deployer: Address;
  name: string;
  timestamp: bigint;
}

// Enhanced DAO information with additional metadata
export interface DAO extends DeployedDAO {
  tokenInfo?: {
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: bigint;
  };
  proposalCount?: number;
  memberCount?: number;
  treasuryBalance?: bigint;
  lastActivity?: bigint;
}

// Proposal information
export interface Proposal {
  id: bigint;
  proposer: Address;
  targets: Address[];
  values: bigint[];
  signatures: string[];
  calldatas: string[];
  startBlock: bigint;
  endBlock: bigint;
  description: string;
  state: ProposalState;
  votes?: {
    againstVotes: bigint;
    forVotes: bigint;
    abstainVotes: bigint;
  };
  eta?: bigint; // Timelock execution time
}

// Proposal states from Governor contract
export enum ProposalState {
  Pending = 0,
  Active = 1,
  Canceled = 2,
  Defeated = 3,
  Succeeded = 4,
  Queued = 5,
  Expired = 6,
  Executed = 7
}

// Vote support types
export enum VoteSupport {
  Against = 0,
  For = 1,
  Abstain = 2
}

// User's token information
export interface UserTokenInfo {
  balance: bigint;
  votes: bigint;
  delegate: Address;
}

// User's governance activity
export interface UserGovernanceInfo extends UserTokenInfo {
  proposalsCreated: number;
  votesParticipated: number;
  lastVoteTimestamp?: bigint;
}

// Event log types
export interface DAODeployedEvent {
  deployer: Address;
  token: Address;
  governor: Address;
  timelock: Address;
  name: string;
}

export interface ProposalCreatedEvent {
  proposalId: bigint;
  proposer: Address;
  targets: Address[];
  values: bigint[];
  signatures: string[];
  calldatas: string[];
  startBlock: bigint;
  endBlock: bigint;
  description: string;
}

export interface VoteCastEvent {
  voter: Address;
  proposalId: bigint;
  support: VoteSupport;
  weight: bigint;
  reason: string;
}

export interface DelegateChangedEvent {
  delegator: Address;
  fromDelegate: Address;
  toDelegate: Address;
}

// Transaction states for UI
export interface TransactionState {
  status: 'idle' | 'pending' | 'success' | 'error';
  hash?: string;
  error?: string;
  confirmations?: number;
}

// Network-specific configuration
export interface NetworkConfig {
  chainId: number;
  name: string;
  shortName: string;
  blockExplorer?: string;
  rpcUrl?: string;
  gasToken: {
    symbol: string;
    decimals: number;
  };
}

// Deployment form data (user input)
export interface DeploymentFormData {
  // Basic Information
  tokenName: string;
  tokenSymbol: string;
  initialSupply: string;
  initialRecipient: Address;
  
  // Governance Parameters
  votingDelay: string; // in blocks
  votingPeriod: string; // in blocks
  proposalThreshold: string; // in tokens
  quorumPercentage: string; // percentage
  timelockDelay: string; // in seconds
  
  // Advanced Settings
  network: number;
  gasPrice?: 'standard' | 'fast' | 'custom';
  customGasPrice?: string;
  enableGaslessVoting?: boolean;
  enableTokenBurning?: boolean;
  enableTreasuryDiversification?: boolean;
}

// Governance preset configurations
export interface GovernancePreset {
  name: string;
  description: string;
  votingDelay: string;
  votingPeriod: string;
  proposalThreshold: string;
  quorumPercentage: string;
  timelockDelay: string;
}

// Analytics data structures
export interface DAOAnalytics {
  totalProposals: number;
  activeProposals: number;
  proposalSuccessRate: number;
  averageParticipation: number;
  totalMembers: number;
  treasuryValue: bigint;
  governanceActivity: {
    period: string;
    proposals: number;
    votes: number;
    participation: number;
  }[];
}

// Delegate information
export interface Delegate {
  address: Address;
  name?: string;
  description?: string;
  votingPower: bigint;
  delegatorCount: number;
  participationRate: number;
  proposalsCreated: number;
  lastActivity?: bigint;
}

// Error types for better error handling
export interface ContractError {
  name: string;
  message: string;
  code?: string;
  data?: unknown;
}

// Loading states for different operations
export interface LoadingStates {
  deploying: boolean;
  fetchingDAOs: boolean;
  fetchingProposals: boolean;
  voting: boolean;
  delegating: boolean;
  creatingProposal: boolean;
}