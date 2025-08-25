import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { NetworkConfig, DeploymentError, TransactionError } from '../types/index.js';

const execFileAsync = promisify(execFile);

export interface ForgeDeploymentOptions {
  contractPath: string;
  contractName: string;
  constructorArgs?: string[];
  rpcUrl: string;
  hardwareWalletType?: 'ledger' | 'trezor';
  verify?: boolean;
  verifierUrl?: string;
  etherscanApiKey?: string;
  gasEstimateMultiplier?: number;
  broadcast?: boolean;
}

export interface ForgeDeploymentResult {
  success: boolean;
  transactionHash?: string;
  contractAddress?: string;
  gasUsed?: string;
  blockNumber?: string;
  error?: string;
  stdout?: string;
  stderr?: string;
}

/**
 * Deploy a contract using Forge with hardware wallet support
 */
export async function deployContractWithForge(options: ForgeDeploymentOptions): Promise<ForgeDeploymentResult> {
  try {
    const args = buildForgeCreateArgs(options);
    
    console.log('Executing forge create command:', args.join(' '));
    
    const { stdout, stderr } = await execFileAsync('forge', args, {
      cwd: path.resolve('../contracts'), // Go to contracts directory
      timeout: 300000, // 5 minutes timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });

    const result = parseForgeOutput(stdout, stderr);
    
    if (result.success && options.verify && options.etherscanApiKey && options.verifierUrl) {
      // Attempt verification if deployment succeeded
      if (result.contractAddress) {
        try {
          await verifyContractWithForge({
            contractAddress: result.contractAddress,
            contractPath: options.contractPath,
            contractName: options.contractName,
            constructorArgs: options.constructorArgs,
            rpcUrl: options.rpcUrl,
            verifierUrl: options.verifierUrl,
            etherscanApiKey: options.etherscanApiKey
          });
        } catch (verifyError) {
          console.warn('Contract deployment succeeded but verification failed:', verifyError);
        }
      }
    }

    return result;
  } catch (error: any) {
    console.error('Forge deployment error:', error);
    
    if (error.code === 'ENOENT') {
      throw new TransactionError('Forge not found. Please install Foundry: https://getfoundry.sh/');
    }
    
    if (error.code === 'TIMEOUT') {
      throw new DeploymentError('Deployment timed out. This may be due to network congestion or hardware wallet interaction.');
    }

    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

/**
 * Build forge create command arguments
 */
function buildForgeCreateArgs(options: ForgeDeploymentOptions): string[] {
  const args = ['create', `${options.contractPath}:${options.contractName}`];
  
  // RPC URL
  args.push('--rpc-url', options.rpcUrl);
  
  // Hardware wallet options
  if (options.hardwareWalletType === 'ledger') {
    args.push('--ledger');
  } else if (options.hardwareWalletType === 'trezor') {
    args.push('--trezor');
  }
  
  // Constructor arguments
  if (options.constructorArgs && options.constructorArgs.length > 0) {
    args.push('--constructor-args', ...options.constructorArgs);
  }
  
  // Gas settings
  if (options.gasEstimateMultiplier) {
    args.push('--gas-estimate-multiplier', options.gasEstimateMultiplier.toString());
  }
  
  // Broadcast transaction
  if (options.broadcast !== false) {
    args.push('--broadcast');
  }
  
  // Verification options
  if (options.verify && options.etherscanApiKey && options.verifierUrl) {
    args.push('--verify');
    args.push('--etherscan-api-key', options.etherscanApiKey);
    
    // Detect verifier type based on URL
    if (options.verifierUrl.includes('etherscan')) {
      args.push('--verifier', 'etherscan');
    } else if (options.verifierUrl.includes('polygonscan')) {
      args.push('--verifier', 'etherscan');
      args.push('--verifier-url', options.verifierUrl);
    } else if (options.verifierUrl.includes('arbiscan')) {
      args.push('--verifier', 'etherscan'); 
      args.push('--verifier-url', options.verifierUrl);
    } else if (options.verifierUrl.includes('basescan')) {
      args.push('--verifier', 'etherscan');
      args.push('--verifier-url', options.verifierUrl);
    } else {
      args.push('--verifier', 'blockscout');
      args.push('--verifier-url', options.verifierUrl);
    }
  }
  
  // Verbose output
  args.push('-vvv');
  
  return args;
}

/**
 * Parse forge output to extract deployment information
 */
function parseForgeOutput(stdout: string, stderr: string): ForgeDeploymentResult {
  const output = stdout + '\n' + stderr;
  
  // Check for success indicators
  const successMatch = output.match(/✅\s*\[Success\]/);
  if (!successMatch) {
    return {
      success: false,
      error: 'Deployment failed',
      stdout,
      stderr
    };
  }
  
  // Extract transaction hash
  const hashMatch = output.match(/Hash:\s*(0x[a-fA-F0-9]{64})/);
  const transactionHash = hashMatch ? hashMatch[1] : undefined;
  
  // Extract contract address
  const addressMatch = output.match(/Contract Address:\s*(0x[a-fA-F0-9]{40})/);
  const contractAddress = addressMatch ? addressMatch[1] : undefined;
  
  // Extract block number
  const blockMatch = output.match(/Block:\s*(\d+)/);
  const blockNumber = blockMatch ? blockMatch[1] : undefined;
  
  // Extract gas used
  const gasMatch = output.match(/Paid:\s*([\d,]+)\s*gas/);
  const gasUsed = gasMatch ? gasMatch[1].replace(/,/g, '') : undefined;
  
  return {
    success: true,
    transactionHash,
    contractAddress,
    blockNumber,
    gasUsed,
    stdout,
    stderr
  };
}

export interface ForgeVerificationOptions {
  contractAddress: string;
  contractPath: string;
  contractName: string;
  constructorArgs?: string[];
  rpcUrl: string;
  verifierUrl: string;
  etherscanApiKey: string;
  chainId?: number;
}

/**
 * Verify a deployed contract using Forge
 */
export async function verifyContractWithForge(options: ForgeVerificationOptions): Promise<void> {
  const args = [
    'verify-contract',
    options.contractAddress,
    `${options.contractPath}:${options.contractName}`
  ];
  
  // Chain ID
  if (options.chainId) {
    args.push('--chain-id', options.chainId.toString());
  }
  
  // Constructor arguments
  if (options.constructorArgs && options.constructorArgs.length > 0) {
    const encodedArgs = await encodeConstructorArgs(options.constructorArgs);
    args.push('--constructor-args', encodedArgs);
  }
  
  // Verifier settings
  args.push('--etherscan-api-key', options.etherscanApiKey);
  
  if (options.verifierUrl.includes('etherscan')) {
    args.push('--verifier', 'etherscan');
  } else {
    args.push('--verifier', 'blockscout');
    args.push('--verifier-url', options.verifierUrl);
  }
  
  args.push('--watch'); // Watch for verification result
  args.push('-vvv');
  
  try {
    const { stdout, stderr } = await execFileAsync('forge', args, {
      cwd: path.resolve('../contracts'),
      timeout: 180000, // 3 minutes timeout for verification
      maxBuffer: 1024 * 1024
    });
    
    console.log('Contract verification result:', stdout);
    
    if (stderr && !stderr.includes('warning')) {
      console.error('Verification stderr:', stderr);
    }
    
    // Check for verification success
    if (!stdout.includes('Contract successfully verified') && !stdout.includes('Already verified')) {
      throw new Error('Contract verification failed');
    }
    
  } catch (error: any) {
    console.error('Contract verification failed:', error);
    throw new Error(`Contract verification failed: ${error.message}`);
  }
}

/**
 * Encode constructor arguments using cast abi-encode
 */
async function encodeConstructorArgs(args: string[]): Promise<string> {
  // Create a constructor signature based on argument types
  // This is a simplified approach - in practice, you'd want to parse the ABI
  const signature = `constructor(${args.map(() => 'string').join(',')})`;
  
  try {
    const { stdout } = await execFileAsync('cast', [
      'abi-encode',
      signature,
      ...args
    ], {
      timeout: 30000,
      maxBuffer: 1024 * 1024
    });
    
    return stdout.trim();
  } catch (error) {
    console.warn('Failed to encode constructor args with cast, using raw args');
    return args.join(' ');
  }
}

/**
 * Run a Forge script with hardware wallet support
 */
export async function runForgeScript(
  scriptPath: string,
  rpcUrl: string,
  hardwareWalletType?: 'ledger' | 'trezor',
  broadcast: boolean = false,
  verify: boolean = false
): Promise<ForgeDeploymentResult> {
  const args = ['script', scriptPath, '--rpc-url', rpcUrl];
  
  if (hardwareWalletType === 'ledger') {
    args.push('--ledger');
  } else if (hardwareWalletType === 'trezor') {
    args.push('--trezor');
  }
  
  if (broadcast) {
    args.push('--broadcast');
  }
  
  if (verify) {
    args.push('--verify');
  }
  
  args.push('-vvv');
  
  try {
    const { stdout, stderr } = await execFileAsync('forge', args, {
      cwd: path.resolve('../contracts'),
      timeout: 300000, // 5 minutes timeout
      maxBuffer: 2 * 1024 * 1024 // 2MB buffer for script output
    });
    
    return parseForgeOutput(stdout, stderr);
  } catch (error: any) {
    console.error('Forge script execution error:', error);
    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}