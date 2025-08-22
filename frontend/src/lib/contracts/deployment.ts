// Smart contract deployment utilities
import { Address, Hash, createPublicClient, createWalletClient, http, defineChain, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { loadContractArtifacts, validateArtifacts } from './artifacts';

export interface NetworkInfo {
  chainId: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: {
      http: string[];
    };
  };
  blockExplorers?: {
    default: {
      name: string;
      url: string;
    };
  };
}

interface ContractArtifact {
  abi: any[];
  bytecode: {
    object: string;
  };
}

interface DeploymentResult {
  contractAddress: Address;
  transactionHash: Hash;
  blockNumber: bigint;
  gasUsed: bigint;
}

interface FullDeploymentResult {
  factory: DeploymentResult;
  tokenImplementation: DeploymentResult;
  governorImplementation: DeploymentResult;
  timelockImplementation: DeploymentResult;
  networkInfo: NetworkInfo;
  deployer: Address;
  timestamp: string;
}


/**
 * Deploy a single contract
 */
export async function deployContract(
  walletClient: any,
  publicClient: any,
  artifact: ContractArtifact,
  constructorArgs: any[] = []
): Promise<DeploymentResult> {
  try {
    // Deploy the contract
    const hash = await walletClient.deployContract({
      abi: artifact.abi,
      bytecode: artifact.bytecode.object as `0x${string}`,
      args: constructorArgs,
      gas: BigInt(5000000), // Set reasonable gas limit
    });

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (!receipt.contractAddress) {
      throw new Error('Contract deployment failed - no contract address in receipt');
    }

    return {
      contractAddress: receipt.contractAddress,
      transactionHash: hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  } catch (error) {
    console.error('Contract deployment failed:', error);
    throw error;
  }
}

/**
 * Deploy the complete smart contract system
 */
export async function deploySmartContractSystem(
  networkInfo: NetworkInfo,
  deployerPrivateKey: string
): Promise<FullDeploymentResult> {
  try {
    // Validate artifacts first
    console.log('Validating contract artifacts...');
    if (!validateArtifacts()) {
      throw new Error('Contract artifacts validation failed. Please ensure contracts are compiled.');
    }

    // Load contract artifacts
    console.log('Loading contract artifacts...');
    const artifacts = loadContractArtifacts();

    // Create chain configuration
    const chain = defineChain({
      id: networkInfo.chainId,
      name: networkInfo.name,
      nativeCurrency: networkInfo.nativeCurrency,
      rpcUrls: {
        default: {
          http: networkInfo.rpcUrls.default.http,
        },
      },
      blockExplorers: networkInfo.blockExplorers ? {
        default: networkInfo.blockExplorers.default,
      } : undefined,
    });

    // Create clients
    const account = privateKeyToAccount(deployerPrivateKey as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    const walletClient = createWalletClient({
      chain,
      transport: http(),
      account,
    });

    // Verify network connection
    const chainId = await publicClient.getChainId();
    if (chainId !== networkInfo.chainId) {
      throw new Error(`Chain ID mismatch. Expected ${networkInfo.chainId}, got ${chainId}`);
    }

    // Check deployer balance
    const balance = await publicClient.getBalance({ address: account.address });
    const minimumBalance = parseEther('0.1');
    
    if (balance < minimumBalance) {
      throw new Error(`Insufficient balance. Required: 0.1 ETH, Current: ${Number(balance) / 1e18} ETH`);
    }

    console.log(`Deploying contracts to ${networkInfo.name} (${networkInfo.chainId})`);
    console.log(`Deployer: ${account.address}`);
    console.log(`Balance: ${Number(balance) / 1e18} ETH`);

    // Deploy implementation contracts first
    console.log('Deploying implementation contracts...');
    
    const tokenImplementation = await deployContract(
      walletClient,
      publicClient,
      artifacts.tokenImplementation
    );
    console.log(`Token implementation deployed at: ${tokenImplementation.contractAddress}`);

    const governorImplementation = await deployContract(
      walletClient,
      publicClient,
      artifacts.governorImplementation
    );
    console.log(`Governor implementation deployed at: ${governorImplementation.contractAddress}`);

    const timelockImplementation = await deployContract(
      walletClient,
      publicClient,
      artifacts.timelockImplementation
    );
    console.log(`Timelock implementation deployed at: ${timelockImplementation.contractAddress}`);

    // Deploy factory with implementation addresses
    console.log('Deploying factory contract...');
    const factory = await deployContract(
      walletClient,
      publicClient,
      artifacts.factory,
      [
        tokenImplementation.contractAddress,
        governorImplementation.contractAddress,
        timelockImplementation.contractAddress,
      ]
    );
    console.log(`Factory deployed at: ${factory.contractAddress}`);

    const result: FullDeploymentResult = {
      factory,
      tokenImplementation,
      governorImplementation,
      timelockImplementation,
      networkInfo,
      deployer: account.address,
      timestamp: new Date().toISOString(),
    };

    console.log('Deployment completed successfully!');
    return result;

  } catch (error) {
    console.error('Deployment failed:', error);
    throw error;
  }
}

/**
 * Estimate gas for the complete deployment
 */
export async function estimateDeploymentGas(
  networkInfo: NetworkInfo,
  deployerAddress: Address
): Promise<{
  totalGasEstimate: bigint;
  gasPrice: bigint;
  estimatedCost: bigint;
  estimatedCostEth: string;
}> {
  try {
    const chain = defineChain({
      id: networkInfo.chainId,
      name: networkInfo.name,
      nativeCurrency: networkInfo.nativeCurrency,
      rpcUrls: {
        default: {
          http: networkInfo.rpcUrls.default.http,
        },
      },
    });

    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    // Get current gas price
    const gasPrice = await publicClient.getGasPrice();

    // Estimate gas for each contract (these are rough estimates)
    const gasEstimates = {
      tokenImplementation: BigInt(2000000),
      governorImplementation: BigInt(3000000),
      timelockImplementation: BigInt(1500000),
      factory: BigInt(1000000),
    };

    const totalGasEstimate = Object.values(gasEstimates).reduce((sum, gas) => sum + gas, BigInt(0));
    const estimatedCost = totalGasEstimate * gasPrice;
    const estimatedCostEth = (Number(estimatedCost) / 1e18).toFixed(6);

    return {
      totalGasEstimate,
      gasPrice,
      estimatedCost,
      estimatedCostEth,
    };
  } catch (error) {
    console.error('Gas estimation failed:', error);
    throw error;
  }
}

/**
 * Validate network configuration
 */
export function validateNetworkInfo(networkInfo: NetworkInfo): boolean {
  if (!networkInfo.chainId || networkInfo.chainId <= 0) {
    return false;
  }
  
  if (!networkInfo.name || networkInfo.name.trim() === '') {
    return false;
  }
  
  if (!networkInfo.rpcUrls?.default?.http?.[0]) {
    return false;
  }
  
  if (!networkInfo.nativeCurrency?.symbol) {
    return false;
  }
  
  return true;
}

/**
 * Check if a network already has the contracts deployed
 */
export async function checkExistingDeployment(
  networkInfo: NetworkInfo,
  factoryAddress?: Address
): Promise<{
  isDeployed: boolean;
  factoryAddress?: Address;
  implementationAddresses?: {
    token: Address;
    governor: Address;
    timelock: Address;
  };
}> {
  try {
    if (!factoryAddress) {
      return { isDeployed: false };
    }

    const chain = defineChain({
      id: networkInfo.chainId,
      name: networkInfo.name,
      nativeCurrency: networkInfo.nativeCurrency,
      rpcUrls: {
        default: {
          http: networkInfo.rpcUrls.default.http,
        },
      },
    });

    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    // Check if factory contract exists
    const factoryCode = await publicClient.getBytecode({ address: factoryAddress });
    
    if (!factoryCode || factoryCode === '0x') {
      return { isDeployed: false };
    }

    // If factory exists, try to get implementation addresses
    // This would require calling the factory contract methods
    return {
      isDeployed: true,
      factoryAddress,
      // implementationAddresses would be fetched from factory contract
    };

  } catch (error) {
    console.error('Error checking existing deployment:', error);
    return { isDeployed: false };
  }
}