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
    
    console.log(`\n📡 Broadcasting transaction to ${networkConfig.name}`);
    console.log(`📝 Transaction: ${params.signedTransaction.slice(0, 20)}...`);
    
    // This is a placeholder implementation
    // In a real implementation, we would actually broadcast the transaction
    // But since we want users to use the MCP Ledger server for this, we'll provide clear guidance
    
    throw new TransactionError(`
🚨 Transaction Broadcasting Not Implemented

This DAO Deployer MCP server prepares transactions but does not broadcast them.
Please use your MCP Ledger server to sign and broadcast transactions.

Transaction Details:
- Network: ${params.networkName}
- Signed Transaction: ${params.signedTransaction}
- Expected Hash: ${params.expectedTransactionHash || 'Not provided'}

Steps to Complete:
1. Use your MCP Ledger server's broadcast functionality
2. The Ledger server will return the transaction hash
3. Use the wait-for-confirmation tool below if needed

Example MCP Ledger server usage:
{
  "tool": "broadcast_transaction",
  "arguments": {
    "signed_transaction": "${params.signedTransaction}",
    "network": "${params.networkName}"
  }
}
`);
    
  } catch (error: any) {
    console.error('❌ Transaction broadcast failed:', error.message);
    throw error;
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
    
    console.log(`\n⏳ Waiting for transaction confirmation on ${networkConfig.name}`);
    console.log(`🔗 Transaction Hash: ${params.transactionHash}`);
    console.log(`✅ Required Confirmations: ${params.confirmations}`);
    console.log(`⏰ Timeout: ${params.timeoutMinutes} minutes`);
    
    // Wait for the transaction confirmation
    const result = await waitForTransactionConfirmation({
      transactionHash: params.transactionHash as Hex,
      networkConfig,
      confirmations: params.confirmations
    });
    
    console.log(`\n🎉 Transaction confirmed!`);
    console.log(`📦 Block Number: ${result.blockNumber?.toString()}`);
    console.log(`⛽ Gas Used: ${result.gasUsed?.toLocaleString()}`);
    console.log(`💰 Effective Gas Price: ${result.effectiveGasPrice ? (Number(result.effectiveGasPrice) / 1e9).toFixed(2) + ' gwei' : 'Unknown'}`);
    
    if (result.contractAddress) {
      console.log(`📍 Contract Address: ${result.contractAddress}`);
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
    console.error('❌ Transaction confirmation failed:', error.message);
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
    
    console.log(`\n🔍 Checking transaction status on ${networkConfig.name}`);
    console.log(`🔗 Transaction Hash: ${params.transactionHash}`);
    
    // This would check the transaction status
    // For now, we'll provide guidance on using external tools
    
    const explorerUrl = `${networkConfig.explorerUrl}/tx/${params.transactionHash}`;
    
    return {
      transactionHash: params.transactionHash,
      networkName: params.networkName,
      explorerUrl,
      status: 'unknown',
      message: `Transaction status check not implemented. Please check the block explorer: ${explorerUrl}`,
      instructions: {
        manual_check: `Visit ${explorerUrl}`,
        api_check: networkConfig.explorerApiUrl ? `Use ${networkConfig.explorerApiUrl} API` : 'No API available',
        ledger_server: 'Use your MCP Ledger server to check transaction status'
      }
    };
    
  } catch (error: any) {
    console.error('❌ Transaction status check failed:', error.message);
    throw error;
  }
}