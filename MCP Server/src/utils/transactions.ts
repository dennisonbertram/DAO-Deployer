import { createPublicClient, http, Hex, Address, encodeFunctionData, parseAbi } from 'viem';
import { NetworkConfig, PreparedTransaction } from '../types/index.js';

/**
 * Transaction preparation utilities for external signing
 */

export interface UnsignedTransaction {
  to: Address | null;
  value: bigint;
  data: Hex;
  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
  chainId?: number;
}

// Use the PreparedTransaction interface from types/index.ts - no need to redefine here

export interface SignedTransactionInput {
  signedTransaction: Hex;
  networkName: string;
  expectedTransactionHash?: Hex;
}

export interface TransactionBroadcastResult {
  transactionHash: Hex;
  blockNumber?: bigint;
  blockHash?: Hex;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  status: 'success' | 'failed';
  contractAddress?: Address;
}

/**
 * Create a public client for transaction preparation
 */
export function createTransactionClient(networkConfig: NetworkConfig) {
  return createPublicClient({
    transport: http(networkConfig.rpcUrl)
  });
}

/**
 * Prepare a contract deployment transaction
 */
export async function prepareContractDeployment(params: {
  networkConfig: NetworkConfig;
  contractBytecode: Hex;
  constructorArgs?: any[];
  gasEstimateMultiplier?: number;
  fromAddress?: Address;
  contractName?: string;
}): Promise<PreparedTransaction> {
  
  const { 
    networkConfig, 
    contractBytecode, 
    constructorArgs = [], 
    gasEstimateMultiplier = 1.2,
    fromAddress,
    contractName = 'Unknown Contract'
  } = params;

  console.log(`\n🔧 Preparing contract deployment for ${contractName} on ${networkConfig.name}`);

  const publicClient = createTransactionClient(networkConfig);

  // Estimate gas for deployment
  console.log('⛽ Estimating gas for deployment...');
  const gasEstimate = await publicClient.estimateGas({
    account: fromAddress,
    data: contractBytecode,
    value: 0n,
  });

  const adjustedGas = BigInt(Math.ceil(Number(gasEstimate) * gasEstimateMultiplier));
  console.log(`⛽ Gas estimate: ${gasEstimate.toLocaleString()} (adjusted: ${adjustedGas.toLocaleString()})`);

  // Get current gas price
  const gasPrice = await publicClient.getGasPrice();
  const estimatedCostWei = adjustedGas * gasPrice;
  const estimatedCostEth = (Number(estimatedCostWei) / 1e18).toFixed(6);

  console.log(`💰 Gas price: ${(Number(gasPrice) / 1e9).toFixed(2)} gwei`);
  console.log(`💸 Estimated cost: ${estimatedCostEth} ETH`);

  // Get chain ID
  const chainId = await publicClient.getChainId();

  const unsignedTransaction: UnsignedTransaction = {
    to: null, // null for contract deployment
    value: 0n,
    data: contractBytecode,
    gas: adjustedGas,
    gasPrice: gasPrice,
    chainId: chainId
  };

  return {
    transactionType: 'contract_deployment',
    unsignedTransaction: {
      to: unsignedTransaction.to,
      value: unsignedTransaction.value.toString(),
      data: unsignedTransaction.data,
      gas: unsignedTransaction.gas?.toString(),
      gasPrice: unsignedTransaction.gasPrice?.toString(),
      maxFeePerGas: unsignedTransaction.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: unsignedTransaction.maxPriorityFeePerGas?.toString(),
      nonce: unsignedTransaction.nonce,
      chainId: unsignedTransaction.chainId
    },
    metadata: {
      networkName: networkConfig.name,
      networkChainId: chainId,
      contractName,
      constructorArgs,
      description: `Deploy ${contractName} contract`,
      estimatedGasUsage: adjustedGas.toString(),
      estimatedCostEth
    }
  } as PreparedTransaction;
}

/**
 * Prepare a contract function call transaction
 */
export async function prepareContractCall(params: {
  networkConfig: NetworkConfig;
  contractAddress: Address;
  abi: any[];
  functionName: string;
  args?: any[];
  value?: bigint;
  gasEstimateMultiplier?: number;
  fromAddress?: Address;
}): Promise<PreparedTransaction> {
  
  const { 
    networkConfig, 
    contractAddress, 
    abi,
    functionName,
    args = [], 
    value = 0n,
    gasEstimateMultiplier = 1.2,
    fromAddress
  } = params;

  console.log(`\n🔧 Preparing contract call to ${functionName} on ${networkConfig.name}`);

  const publicClient = createTransactionClient(networkConfig);

  // Encode function data
  const data = encodeFunctionData({
    abi,
    functionName,
    args
  });

  // Estimate gas for the call
  console.log('⛽ Estimating gas for contract call...');
  const gasEstimate = await publicClient.estimateGas({
    account: fromAddress,
    to: contractAddress,
    data,
    value,
  });

  const adjustedGas = BigInt(Math.ceil(Number(gasEstimate) * gasEstimateMultiplier));
  console.log(`⛽ Gas estimate: ${gasEstimate.toLocaleString()} (adjusted: ${adjustedGas.toLocaleString()})`);

  // Get current gas price
  const gasPrice = await publicClient.getGasPrice();
  const estimatedCostWei = adjustedGas * gasPrice;
  const estimatedCostEth = (Number(estimatedCostWei) / 1e18).toFixed(6);

  console.log(`💰 Gas price: ${(Number(gasPrice) / 1e9).toFixed(2)} gwei`);
  console.log(`💸 Estimated cost: ${estimatedCostEth} ETH`);

  // Get chain ID
  const chainId = await publicClient.getChainId();

  const unsignedTransaction: UnsignedTransaction = {
    to: contractAddress,
    value,
    data,
    gas: adjustedGas,
    gasPrice: gasPrice,
    chainId: chainId
  };

  return {
    transactionType: 'contract_call',
    unsignedTransaction: {
      to: unsignedTransaction.to,
      value: unsignedTransaction.value.toString(),
      data: unsignedTransaction.data,
      gas: unsignedTransaction.gas?.toString(),
      gasPrice: unsignedTransaction.gasPrice?.toString(),
      maxFeePerGas: unsignedTransaction.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: unsignedTransaction.maxPriorityFeePerGas?.toString(),
      nonce: unsignedTransaction.nonce,
      chainId: unsignedTransaction.chainId
    },
    metadata: {
      networkName: networkConfig.name,
      networkChainId: chainId,
      functionName,
      description: `Call ${functionName} on contract ${contractAddress}`,
      estimatedGasUsage: adjustedGas.toString(),
      estimatedCostEth
    }
  } as PreparedTransaction;
}

/**
 * Broadcast a signed transaction and wait for confirmation
 */
export async function broadcastSignedTransaction(params: SignedTransactionInput): Promise<TransactionBroadcastResult> {
  const { signedTransaction, networkName, expectedTransactionHash } = params;

  console.log(`\n📡 Broadcasting signed transaction to ${networkName}`);
  console.log(`📝 Transaction: ${signedTransaction.slice(0, 20)}...`);

  // This is a placeholder - in the real implementation, we'd need the network config
  // For now, we'll create a simple error to indicate this needs to be implemented
  throw new Error(`Transaction broadcasting not yet implemented. Please use the MCP Ledger server for transaction signing and broadcasting.

Prepared transaction data:
- Network: ${networkName}
- Signed Transaction: ${signedTransaction}
- Expected Hash: ${expectedTransactionHash || 'Not provided'}

To complete deployment:
1. Use your MCP Ledger server to sign and broadcast this transaction
2. The Ledger server will return the transaction hash and receipt
3. Use the verify-contract tool with the returned contract address if verification is needed`);
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransactionConfirmation(params: {
  transactionHash: Hex;
  networkConfig: NetworkConfig;
  confirmations?: number;
}): Promise<TransactionBroadcastResult> {
  
  const { transactionHash, networkConfig, confirmations = 1 } = params;

  console.log(`\n⏳ Waiting for transaction confirmation: ${transactionHash}`);
  
  const publicClient = createTransactionClient(networkConfig);

  try {
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: transactionHash,
      confirmations
    });

    // Transaction confirmed
    // Gas used info logged
    
    return {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      gasUsed: receipt.gasUsed,
      effectiveGasPrice: receipt.effectiveGasPrice,
      status: receipt.status === 'success' ? 'success' : 'failed',
      contractAddress: receipt.contractAddress || undefined
    };

  } catch (error: any) {
    console.error(`❌ Transaction failed or timed out: ${error.message}`);
    throw new Error(`Transaction confirmation failed: ${error.message}`);
  }
}

/**
 * Calculate transaction cost in ETH
 */
export function calculateTransactionCost(gasUsed: bigint, gasPrice: bigint): string {
  const costWei = gasUsed * gasPrice;
  return (Number(costWei) / 1e18).toFixed(6);
}

/**
 * Format transaction for display
 */
export function formatTransactionSummary(preparedTx: PreparedTransaction): string {
  const { transactionType, unsignedTransaction, metadata } = preparedTx;
  
  const lines = [
    `📋 Transaction Summary`,
    `Type: ${transactionType}`,
    `Network: ${metadata.networkName} (Chain ID: ${metadata.networkChainId})`,
    `Description: ${metadata.description}`,
    ``,
    `💰 Cost Estimates:`,
    `Gas Limit: ${unsignedTransaction.gas?.toLocaleString() || 'Not estimated'}`,
    `Gas Price: ${unsignedTransaction.gasPrice ? (Number(unsignedTransaction.gasPrice) / 1e9).toFixed(2) + ' gwei' : 'Not set'}`,
    `Estimated Cost: ${metadata.estimatedCostEth} ETH`,
    ``,
    `🔧 Transaction Data:`,
    `To: ${unsignedTransaction.to || 'Contract Deployment'}`,
    `Value: ${unsignedTransaction.value.toString()} wei`,
    `Data: ${unsignedTransaction.data.slice(0, 50)}${unsignedTransaction.data.length > 50 ? '...' : ''}`,
  ];

  if (metadata.contractName) {
    lines.push(`Contract: ${metadata.contractName}`);
  }

  if (metadata.functionName) {
    lines.push(`Function: ${metadata.functionName}`);
  }

  return lines.join('\n');
}