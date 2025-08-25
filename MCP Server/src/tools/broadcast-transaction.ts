import { z } from 'zod';
import { getNetworkConfig, resolveNetworkConfig } from '../networks/index.js';
import { waitForTransactionConfirmation } from '../utils/transactions.js';
import { TransactionBroadcastInput, TransactionError } from '../types/index.js';
import { Hex } from 'viem';

// Input validation schema for transaction broadcasting
export const BroadcastTransactionInputSchema = z.object({
  signedTransaction: z.string().startsWith('0x', 'Signed transaction must be a valid hex string'),
  networkName: z.string(),
  expectedTransactionHash: z.string().startsWith('0x').optional(),
  waitForConfirmation: z.boolean().default(true),
  confirmations: z.number().min(1).max(20).default(1)
});

/**
 * Broadcast a signed transaction and optionally wait for confirmation
 */
export async function broadcastSignedTransaction(input: z.infer<typeof BroadcastTransactionInputSchema>) {
  try {
    // Validate input
    const params = BroadcastTransactionInputSchema.parse(input);
    
    // Get network configuration
    const networkConfig = await resolveNetworkConfig(getNetworkConfig(params.networkName));
    
    // Import viem here to avoid import issues
    const { createPublicClient, http } = await import('viem');
    
    // Create public client for broadcasting
    const publicClient = createPublicClient({
      transport: http(networkConfig.rpcUrl)
    });
    
    // Broadcast the signed transaction
    const transactionHash = await publicClient.sendRawTransaction({
      serializedTransaction: params.signedTransaction as Hex
    });
    
    // Verify the expected hash matches if provided
    if (params.expectedTransactionHash && transactionHash !== params.expectedTransactionHash) {
      throw new TransactionError(`Transaction hash mismatch. Expected: ${params.expectedTransactionHash}, Got: ${transactionHash}`);
    }
    
    let confirmationResult = undefined;
    
    // Wait for confirmation if requested
    if (params.waitForConfirmation) {
      try {
        confirmationResult = await waitForTransactionConfirmation({
          transactionHash,
          networkConfig,
          confirmations: params.confirmations
        });
      } catch (confirmError) {
        // Transaction was broadcast successfully, but confirmation failed
        // Return the hash so user knows transaction was sent
      }
    }
    
    return {
      success: true,
      transactionHash,
      networkName: params.networkName,
      explorerUrl: networkConfig.explorerUrl ? `${networkConfig.explorerUrl}/tx/${transactionHash}` : undefined,
      confirmation: confirmationResult ? {
        blockNumber: confirmationResult.blockNumber?.toString(),
        blockHash: confirmationResult.blockHash,
        gasUsed: confirmationResult.gasUsed?.toString(),
        effectiveGasPrice: confirmationResult.effectiveGasPrice?.toString(),
        contractAddress: confirmationResult.contractAddress,
        status: confirmationResult.status
      } : undefined,
      message: confirmationResult 
        ? 'Transaction broadcast and confirmed successfully'
        : 'Transaction broadcast successfully. Use wait-for-confirmation to check status.'
    };
    
  } catch (error: any) {
    throw new TransactionError(`Failed to broadcast transaction: ${error.message}`);
  }
}

// Input validation schema for waiting for confirmation
export const WaitForConfirmationInputSchema = z.object({
  transactionHash: z.string().startsWith('0x', 'Transaction hash must be a valid hex string'),
  networkName: z.string(),
  confirmations: z.number().min(1).max(20).default(1),
  timeoutMinutes: z.number().min(1).max(30).default(10)
});

/**
 * Wait for transaction confirmation on the network
 */
export async function waitForConfirmation(input: z.infer<typeof WaitForConfirmationInputSchema>) {
  try {
    // Validate input
    const params = WaitForConfirmationInputSchema.parse(input);
    
    // Get network configuration
    const networkConfig = await resolveNetworkConfig(getNetworkConfig(params.networkName));
    
    
    // Wait for the transaction confirmation
    const result = await waitForTransactionConfirmation({
      transactionHash: params.transactionHash as Hex,
      networkConfig,
      confirmations: params.confirmations
    });
    
    
    if (result.contractAddress) {
    }
    
    return {
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber?.toString(),
      blockHash: result.blockHash,
      gasUsed: result.gasUsed?.toString(),
      effectiveGasPrice: result.effectiveGasPrice?.toString(),
      status: result.status,
      contractAddress: result.contractAddress,
      confirmations: params.confirmations,
      networkName: params.networkName,
      explorerUrl: `${networkConfig.explorerUrl}/tx/${params.transactionHash}`
    };
    
  } catch (error: any) {
    throw new TransactionError(`Failed to confirm transaction: ${error.message}`);
  }
}

/**
 * Check transaction status without waiting
 */
export const CheckTransactionStatusInputSchema = z.object({
  transactionHash: z.string().startsWith('0x', 'Transaction hash must be a valid hex string'),
  networkName: z.string()
});

/**
 * Check the current status of a transaction
 */
export async function checkTransactionStatus(input: z.infer<typeof CheckTransactionStatusInputSchema>) {
  try {
    // Validate input
    const params = CheckTransactionStatusInputSchema.parse(input);
    
    // Get network configuration
    const networkConfig = await resolveNetworkConfig(getNetworkConfig(params.networkName));
    
    // Import viem here to avoid import issues
    const { createPublicClient, http } = await import('viem');
    
    // Create public client for checking transaction
    const publicClient = createPublicClient({
      transport: http(networkConfig.rpcUrl)
    });
    
    const explorerUrl = networkConfig.explorerUrl ? `${networkConfig.explorerUrl}/tx/${params.transactionHash}` : undefined;
    
    try {
      // Get transaction receipt
      const receipt = await publicClient.getTransactionReceipt({ 
        hash: params.transactionHash as Hex 
      });
      
      return {
        transactionHash: params.transactionHash,
        networkName: params.networkName,
        explorerUrl,
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber.toString(),
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
        contractAddress: receipt.contractAddress || undefined,
        confirmations: 'Available - use wait-for-confirmation to get exact count',
        message: receipt.status === 'success' 
          ? 'Transaction confirmed successfully'
          : 'Transaction failed on blockchain'
      };
      
    } catch (receiptError: any) {
      // Try to get transaction details (might be pending)
      try {
        const transaction = await publicClient.getTransaction({ 
          hash: params.transactionHash as Hex 
        });
        
        return {
          transactionHash: params.transactionHash,
          networkName: params.networkName,
          explorerUrl,
          status: 'pending',
          blockNumber: transaction.blockNumber?.toString() || 'pending',
          blockHash: transaction.blockHash || 'pending',
          gasPrice: transaction.gasPrice?.toString(),
          maxFeePerGas: transaction.maxFeePerGas?.toString(),
          nonce: transaction.nonce,
          message: 'Transaction is pending confirmation'
        };
        
      } catch (txError: any) {
        // Transaction not found
        return {
          transactionHash: params.transactionHash,
          networkName: params.networkName,
          explorerUrl,
          status: 'not_found',
          message: 'Transaction not found on the blockchain. It may not have been broadcast yet or the hash may be incorrect.',
          suggestions: [
            'Verify the transaction hash is correct',
            'Check if the transaction was actually broadcast',
            'Wait a few moments and try again if recently broadcast'
          ]
        };
      }
    }
    
  } catch (error: any) {
    throw new TransactionError(`Failed to check transaction status: ${error.message}`);
  }
}