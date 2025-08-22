import { DAOConfig, ValidationError } from '@/types/deploy';

export function validateBasicInfo(config: Partial<DAOConfig>): ValidationError[] {
  const errors: ValidationError[] = [];

  // DAO Name validation
  if (!config.name?.trim()) {
    errors.push({ field: 'name', message: 'DAO name is required' });
  } else if (config.name.length < 3) {
    errors.push({ field: 'name', message: 'DAO name must be at least 3 characters' });
  } else if (config.name.length > 50) {
    errors.push({ field: 'name', message: 'DAO name must be less than 50 characters' });
  } else if (!/^[a-zA-Z0-9\s]+$/.test(config.name)) {
    errors.push({ field: 'name', message: 'DAO name can only contain letters, numbers, and spaces' });
  }

  // Description validation
  if (config.description && config.description.length > 500) {
    errors.push({ field: 'description', message: 'Description must be less than 500 characters' });
  }

  // Token Name validation
  if (!config.tokenName?.trim()) {
    errors.push({ field: 'tokenName', message: 'Token name is required' });
  } else if (config.tokenName.length < 3) {
    errors.push({ field: 'tokenName', message: 'Token name must be at least 3 characters' });
  } else if (config.tokenName.length > 30) {
    errors.push({ field: 'tokenName', message: 'Token name must be less than 30 characters' });
  } else if (!/^[a-zA-Z0-9\s]+$/.test(config.tokenName)) {
    errors.push({ field: 'tokenName', message: 'Token name can only contain letters, numbers, and spaces' });
  }

  // Token Symbol validation
  if (!config.tokenSymbol?.trim()) {
    errors.push({ field: 'tokenSymbol', message: 'Token symbol is required' });
  } else if (config.tokenSymbol.length < 2) {
    errors.push({ field: 'tokenSymbol', message: 'Token symbol must be at least 2 characters' });
  } else if (config.tokenSymbol.length > 10) {
    errors.push({ field: 'tokenSymbol', message: 'Token symbol must be less than 10 characters' });
  } else if (!/^[A-Z]+$/.test(config.tokenSymbol)) {
    errors.push({ field: 'tokenSymbol', message: 'Token symbol must be uppercase letters only' });
  }

  // Initial Supply validation
  if (!config.initialSupply?.trim()) {
    errors.push({ field: 'initialSupply', message: 'Initial supply is required' });
  } else {
    const supply = parseFloat(config.initialSupply);
    if (isNaN(supply) || supply <= 0) {
      errors.push({ field: 'initialSupply', message: 'Initial supply must be a positive number' });
    } else if (supply > 1e18) {
      errors.push({ field: 'initialSupply', message: 'Initial supply is too large' });
    }
  }

  // Initial Recipient validation (Ethereum address)
  if (!config.initialRecipient?.trim()) {
    errors.push({ field: 'initialRecipient', message: 'Initial recipient address is required' });
  } else if (!isValidEthereumAddress(config.initialRecipient)) {
    errors.push({ field: 'initialRecipient', message: 'Invalid Ethereum address' });
  }

  return errors;
}

export function validateGovernanceParams(config: Partial<DAOConfig>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Voting Delay validation
  if (config.votingDelay === undefined || config.votingDelay < 0) {
    errors.push({ field: 'votingDelay', message: 'Voting delay must be a non-negative number' });
  } else if (config.votingDelay > 100000) {
    errors.push({ field: 'votingDelay', message: 'Voting delay is too large (max ~2 weeks)' });
  }

  // Voting Period validation
  if (config.votingPeriod === undefined || config.votingPeriod <= 0) {
    errors.push({ field: 'votingPeriod', message: 'Voting period must be a positive number' });
  } else if (config.votingPeriod > 500000) {
    errors.push({ field: 'votingPeriod', message: 'Voting period is too large (max ~10 weeks)' });
  }

  // Proposal Threshold validation
  if (!config.proposalThreshold?.trim()) {
    errors.push({ field: 'proposalThreshold', message: 'Proposal threshold is required' });
  } else {
    const threshold = parseFloat(config.proposalThreshold);
    if (isNaN(threshold) || threshold < 0) {
      errors.push({ field: 'proposalThreshold', message: 'Proposal threshold must be a non-negative number' });
    }
  }

  // Quorum Percentage validation
  if (config.quorumPercentage === undefined || config.quorumPercentage <= 0) {
    errors.push({ field: 'quorumPercentage', message: 'Quorum percentage must be greater than 0' });
  } else if (config.quorumPercentage > 100) {
    errors.push({ field: 'quorumPercentage', message: 'Quorum percentage cannot exceed 100%' });
  }

  // Timelock Delay validation
  if (config.timelockDelay === undefined || config.timelockDelay < 0) {
    errors.push({ field: 'timelockDelay', message: 'Timelock delay must be a non-negative number' });
  } else if (config.timelockDelay > 2592000) { // 30 days in seconds
    errors.push({ field: 'timelockDelay', message: 'Timelock delay is too large (max 30 days)' });
  }

  return errors;
}

export function validateAdvancedSettings(config: Partial<DAOConfig>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Network validation
  if (!config.network) {
    errors.push({ field: 'network', message: 'Network selection is required' });
  }

  // Custom Gas Price validation
  if (config.gasOptimization === 'custom') {
    if (!config.customGasPrice?.trim()) {
      errors.push({ field: 'customGasPrice', message: 'Custom gas price is required when using custom optimization' });
    } else {
      const gasPrice = parseFloat(config.customGasPrice);
      if (isNaN(gasPrice) || gasPrice <= 0) {
        errors.push({ field: 'customGasPrice', message: 'Custom gas price must be a positive number' });
      }
    }
  }

  return errors;
}

export function validateComplete(config: DAOConfig): ValidationError[] {
  return [
    ...validateBasicInfo(config),
    ...validateGovernanceParams(config),
    ...validateAdvancedSettings(config),
  ];
}

function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
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