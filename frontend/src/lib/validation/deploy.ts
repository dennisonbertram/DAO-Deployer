import { DAOConfig, ValidationError } from '@/types/deploy';
import { isAddress } from 'viem';

// Constants for validation limits
const DAO_NAME_MIN_LENGTH = 3;
const DAO_NAME_MAX_LENGTH = 50;
const TOKEN_SYMBOL_MIN_LENGTH = 2;
const TOKEN_SYMBOL_MAX_LENGTH = 6;
const DESCRIPTION_MAX_LENGTH = 500;
const MAX_SUPPLY = 1e15; // 1 quadrillion (prevent overflow)

// Helper function to check for consecutive spaces
function hasConsecutiveSpaces(str: string): boolean {
  return /\s{2,}/.test(str);
}

// Helper function to check for leading/trailing spaces
function hasLeadingOrTrailingSpaces(str: string): boolean {
  return str !== str.trim();
}

// Helper function to check for HTML/script tags (XSS prevention)
function containsHtmlOrScript(str: string): boolean {
  return /<script|<\/script|<iframe|javascript:/i.test(str);
}

export function validateBasicInfo(config: Partial<DAOConfig>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Description validation
  if (config.description) {
    if (config.description.length > DESCRIPTION_MAX_LENGTH) {
      errors.push({ field: 'description', message: `Description must not exceed ${DESCRIPTION_MAX_LENGTH} characters` });
    }
    if (containsHtmlOrScript(config.description)) {
      errors.push({ field: 'description', message: 'Description cannot contain HTML or script tags' });
    }
  }

  // DAO Name (stored as tokenName in contract) validation
  if (!config.tokenName?.trim()) {
    errors.push({ field: 'tokenName', message: 'DAO name is required' });
  } else {
    if (hasLeadingOrTrailingSpaces(config.tokenName)) {
      errors.push({ field: 'tokenName', message: 'DAO name cannot have leading or trailing spaces' });
    }
    if (hasConsecutiveSpaces(config.tokenName)) {
      errors.push({ field: 'tokenName', message: 'DAO name cannot contain consecutive spaces' });
    }
    if (config.tokenName.trim().length < DAO_NAME_MIN_LENGTH) {
      errors.push({ field: 'tokenName', message: `DAO name must be at least ${DAO_NAME_MIN_LENGTH} characters` });
    }
    if (config.tokenName.length > DAO_NAME_MAX_LENGTH) {
      errors.push({ field: 'tokenName', message: `DAO name must not exceed ${DAO_NAME_MAX_LENGTH} characters` });
    }
    if (!/^[a-zA-Z0-9 ]+$/.test(config.tokenName)) {
      errors.push({ field: 'tokenName', message: 'DAO name can only contain letters, numbers, and single spaces' });
    }
  }

  // Token Symbol validation
  if (!config.tokenSymbol?.trim()) {
    errors.push({ field: 'tokenSymbol', message: 'Token symbol is required' });
  } else {
    if (config.tokenSymbol.length < TOKEN_SYMBOL_MIN_LENGTH) {
      errors.push({ field: 'tokenSymbol', message: `Token symbol must be at least ${TOKEN_SYMBOL_MIN_LENGTH} characters` });
    }
    if (config.tokenSymbol.length > TOKEN_SYMBOL_MAX_LENGTH) {
      errors.push({ field: 'tokenSymbol', message: `Token symbol must not exceed ${TOKEN_SYMBOL_MAX_LENGTH} characters` });
    }
    if (!/^[A-Z]+$/.test(config.tokenSymbol)) {
      errors.push({ field: 'tokenSymbol', message: 'Token symbol must be uppercase letters only (no spaces or numbers)' });
    }
  }

  // Initial Supply validation
  if (!config.initialSupply?.trim()) {
    errors.push({ field: 'initialSupply', message: 'Initial supply is required' });
  } else {
    const supply = parseFloat(config.initialSupply);
    if (isNaN(supply)) {
      errors.push({ field: 'initialSupply', message: 'Initial supply must be a valid number' });
    } else if (supply <= 0) {
      errors.push({ field: 'initialSupply', message: 'Initial supply must be greater than zero' });
    } else if (!Number.isInteger(supply)) {
      errors.push({ field: 'initialSupply', message: 'Initial supply must be a whole number' });
    } else if (supply > MAX_SUPPLY) {
      errors.push({ field: 'initialSupply', message: `Initial supply is too large (maximum ${MAX_SUPPLY.toExponential()})` });
    }
  }

  // Initial Recipient validation (Ethereum address)
  if (!config.initialRecipient?.trim()) {
    errors.push({ field: 'initialRecipient', message: 'Initial recipient address is required' });
  } else if (!isValidEthereumAddress(config.initialRecipient)) {
    errors.push({ field: 'initialRecipient', message: 'Invalid Ethereum address format' });
  }

  return errors;
}

// Constants for governance validation
const VOTING_DELAY_MIN = 1;
const VOTING_DELAY_MAX = 100800; // ~2 weeks at 12s blocks
const VOTING_PERIOD_MIN = 1;
const VOTING_PERIOD_MAX = 604800; // ~100 days at 12s blocks
const TIMELOCK_DELAY_MIN = 0;
const TIMELOCK_DELAY_MAX = 2592000; // 30 days in seconds
const QUORUM_MIN = 1;
const QUORUM_MAX = 100;

export function validateGovernanceParams(config: Partial<DAOConfig>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Voting Delay validation
  if (config.votingDelay === undefined || config.votingDelay === null) {
    errors.push({ field: 'votingDelay', message: 'Voting delay is required' });
  } else if (!Number.isInteger(config.votingDelay)) {
    errors.push({ field: 'votingDelay', message: 'Voting delay must be a whole number of blocks' });
  } else if (config.votingDelay < VOTING_DELAY_MIN) {
    errors.push({ field: 'votingDelay', message: `Voting delay must be at least ${VOTING_DELAY_MIN} block` });
  } else if (config.votingDelay > VOTING_DELAY_MAX) {
    errors.push({ field: 'votingDelay', message: `Voting delay is too large (maximum ${VOTING_DELAY_MAX} blocks, ~2 weeks)` });
  }

  // Voting Period validation
  if (config.votingPeriod === undefined || config.votingPeriod === null) {
    errors.push({ field: 'votingPeriod', message: 'Voting period is required' });
  } else if (!Number.isInteger(config.votingPeriod)) {
    errors.push({ field: 'votingPeriod', message: 'Voting period must be a whole number of blocks' });
  } else if (config.votingPeriod < VOTING_PERIOD_MIN) {
    errors.push({ field: 'votingPeriod', message: `Voting period must be at least ${VOTING_PERIOD_MIN} block` });
  } else if (config.votingPeriod > VOTING_PERIOD_MAX) {
    errors.push({ field: 'votingPeriod', message: `Voting period is too large (maximum ${VOTING_PERIOD_MAX} blocks, ~100 days)` });
  }

  // Proposal Threshold validation
  if (!config.proposalThreshold?.trim()) {
    errors.push({ field: 'proposalThreshold', message: 'Proposal threshold is required' });
  } else {
    const threshold = parseFloat(config.proposalThreshold);
    if (isNaN(threshold)) {
      errors.push({ field: 'proposalThreshold', message: 'Proposal threshold must be a valid number' });
    } else if (threshold < 0) {
      errors.push({ field: 'proposalThreshold', message: 'Proposal threshold cannot be negative' });
    } else if (!Number.isInteger(threshold)) {
      errors.push({ field: 'proposalThreshold', message: 'Proposal threshold must be a whole number' });
    } else if (threshold > MAX_SUPPLY) {
      errors.push({ field: 'proposalThreshold', message: 'Proposal threshold is too large' });
    }
  }

  // Quorum Percentage validation
  if (config.quorumPercentage === undefined || config.quorumPercentage === null) {
    errors.push({ field: 'quorumPercentage', message: 'Quorum percentage is required' });
  } else if (!Number.isInteger(config.quorumPercentage)) {
    errors.push({ field: 'quorumPercentage', message: 'Quorum percentage must be a whole number' });
  } else if (config.quorumPercentage < QUORUM_MIN) {
    errors.push({ field: 'quorumPercentage', message: `Quorum percentage must be at least ${QUORUM_MIN}%` });
  } else if (config.quorumPercentage > QUORUM_MAX) {
    errors.push({ field: 'quorumPercentage', message: `Quorum percentage cannot exceed ${QUORUM_MAX}%` });
  }

  // Timelock Delay validation
  if (config.timelockDelay === undefined || config.timelockDelay === null) {
    errors.push({ field: 'timelockDelay', message: 'Timelock delay is required' });
  } else if (!Number.isInteger(config.timelockDelay)) {
    errors.push({ field: 'timelockDelay', message: 'Timelock delay must be a whole number of seconds' });
  } else if (config.timelockDelay < TIMELOCK_DELAY_MIN) {
    errors.push({ field: 'timelockDelay', message: `Timelock delay must be at least ${TIMELOCK_DELAY_MIN} seconds` });
  } else if (config.timelockDelay > TIMELOCK_DELAY_MAX) {
    errors.push({ field: 'timelockDelay', message: `Timelock delay is too large (maximum ${TIMELOCK_DELAY_MAX} seconds, 30 days)` });
  }

  return errors;
}

export function validateAdvancedSettings(config: Partial<DAOConfig>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Network validation
  if (!config.network?.trim()) {
    errors.push({ field: 'network', message: 'Network selection is required' });
  }

  return errors;
}

/**
 * Validates RPC URL format
 * - Must be a valid URL
 * - Must use HTTPS (or HTTP for localhost only)
 * - Optionally check against known provider whitelist
 */
export function validateRpcUrl(url: string, allowHttp = false): { isValid: boolean; error?: string } {
  if (!url?.trim()) {
    return { isValid: false, error: 'RPC URL is required' };
  }

  // Try to parse as URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }

  // Check protocol
  const isLocalhost = parsedUrl.hostname === 'localhost' ||
                      parsedUrl.hostname === '127.0.0.1' ||
                      parsedUrl.hostname === '[::1]';

  if (parsedUrl.protocol === 'https:') {
    // HTTPS is always allowed
    return { isValid: true };
  } else if (parsedUrl.protocol === 'http:') {
    // HTTP only allowed for localhost or if explicitly allowed
    if (isLocalhost || allowHttp) {
      return { isValid: true };
    }
    return { isValid: false, error: 'RPC URL must use HTTPS (HTTP only allowed for localhost)' };
  } else {
    return { isValid: false, error: 'RPC URL must use HTTP or HTTPS protocol' };
  }
}

/**
 * Known reputable RPC providers (optional whitelist)
 */
const KNOWN_RPC_PROVIDERS = [
  'infura.io',
  'alchemy.com',
  'quicknode.com',
  'publicnode.com',
  'cloudflare-eth.com',
  'ankr.com',
  'nodereal.io',
  'llamarpc.com',
  'rpc.builder0x69.io',
  'localhost',
  '127.0.0.1',
];

/**
 * Validates if RPC URL is from a known provider
 */
export function isKnownRpcProvider(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return KNOWN_RPC_PROVIDERS.some(provider =>
      parsedUrl.hostname.includes(provider)
    );
  } catch {
    return false;
  }
}

export function validateComplete(config: DAOConfig): ValidationError[] {
  return [
    ...validateBasicInfo(config),
    ...validateGovernanceParams(config),
    ...validateAdvancedSettings(config),
  ];
}

/**
 * Validates Ethereum address format using viem's isAddress
 * Accepts both checksummed and non-checksummed addresses
 * @param address - The address to validate
 * @returns true if the address is valid
 */
function isValidEthereumAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmedAddress = address.trim();

  // Check if it's a valid address format
  return isAddress(trimmedAddress);
}

export function formatTime(blocks: number, blockTime: number = 12): string {
  const seconds = blocks * blockTime;
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `≈ ${days} day${days !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `≈ ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `≈ ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}

export function formatTimeFromSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `≈ ${days} day${days !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `≈ ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `≈ ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}
