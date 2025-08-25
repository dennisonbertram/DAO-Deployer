/**
 * Unit tests for broadcast-signed-transaction tool
 * Tests transaction broadcasting, confirmation waiting, and status checking
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  broadcastSignedTransaction, 
  waitForConfirmation, 
  checkTransactionStatus 
} from '../../src/tools/broadcast-transaction.js';
import { TransactionError } from '../../src/types/index.js';
import type { TransactionReceipt } from 'viem';

// Mock viem module
vi.mock('viem', () => ({
  createPublicClient: vi.fn(),
  http: vi.fn(),
  formatEther: vi.fn((val) => val.toString())
}));

// Mock network configuration
vi.mock('../../src/networks/index.js', () => ({
  getNetworkConfig: vi.fn((networkName: string) => ({
    name: networkName,
    chainId: networkName === 'sepolia' ? 11155111 : 1,
    rpcUrl: `https://${networkName}.infura.io/v3/YOUR_API_KEY`,
    explorerUrl: `https://${networkName}.etherscan.io`,
    explorerApiUrl: `https://api-${networkName}.etherscan.io/api`,
    testnet: networkName === 'sepolia'
  })),
  resolveNetworkConfig: vi.fn((config: any) => Promise.resolve({
    ...config,
    explorerApiKey: 'test_api_key'
  }))
}));

// Mock transaction utilities
vi.mock('../../src/utils/transactions.js', () => ({
  waitForTransactionConfirmation: vi.fn()
}));

describe('broadcast-signed-transaction', () => {
  let mockPublicClient: any;
  let mockHttp: any;
  let mockCreatePublicClient: any;
  let mockWaitForConfirmation: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import mocked viem
    const viem = await import('viem');
    mockHttp = vi.fn(() => 'http_transport');
    mockCreatePublicClient = vi.fn();
    
    // Create mock public client
    mockPublicClient = {
      sendRawTransaction: vi.fn(),
      getTransactionReceipt: vi.fn(),
      getTransaction: vi.fn(),
      getBlockNumber: vi.fn(),
      getBlock: vi.fn(),
      getBytecode: vi.fn()
    };
    
    mockCreatePublicClient.mockReturnValue(mockPublicClient);
    (viem.createPublicClient as any) = mockCreatePublicClient;
    (viem.http as any) = mockHttp;
    
    // Import and mock transaction utils
    const transactionUtils = await import('../../src/utils/transactions.js');
    mockWaitForConfirmation = transactionUtils.waitForTransactionConfirmation as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('broadcastSignedTransaction', () => {
    it('should successfully broadcast a valid signed transaction', async () => {
      const signedTx = '0x02f8720182020a8405f5e100850fbc1405008252089470997970c51812dc3a010c7d01b50e0d17dc79c88080c001a0c4d9e2f3b5a8d7c1f9e6b3a4d2c8f5e7a9b6d4c1f8e3a7b2d5c9f4e8a3b7d2c6a0b8e3f7a2d6c1f5e9b4a8d3c7f2e6b1a5d9c4f8e2a7b3d6c2f7e3a8b4d9c5f1';
      const expectedHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      mockPublicClient.sendRawTransaction.mockResolvedValue(expectedHash);
      
      const result = await broadcastSignedTransaction({
        signedTransaction: signedTx,
        networkName: 'sepolia',
        waitForConfirmation: false
      });
      
      expect(result).toEqual({
        success: true,
        transactionHash: expectedHash,
        networkName: 'sepolia',
        explorerUrl: `https://sepolia.etherscan.io/tx/${expectedHash}`,
        confirmation: undefined,
        message: 'Transaction broadcast successfully. Use wait-for-confirmation to check status.'
      });
      
      expect(mockPublicClient.sendRawTransaction).toHaveBeenCalledWith({
        serializedTransaction: signedTx
      });
    });

    it('should wait for confirmation when requested', async () => {
      const signedTx = '0x02f8720182020a8405f5e100850fbc1405008252089470997970c51812dc3a010c7d01b50e0d17dc79c88080c001a0c4d9e2f3b5a8d7c1f9e6b3a4d2c8f5e7a9b6d4c1f8e3a7b2d5c9f4e8a3b7d2c6a0b8e3f7a2d6c1f5e9b4a8d3c7f2e6b1a5d9c4f8e2a7b3d6c2f7e3a8b4d9c5f1';
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      
      const mockReceipt: Partial<TransactionReceipt> = {
        transactionHash: txHash as `0x${string}`,
        blockNumber: 12345n,
        blockHash: '0xblockhash123' as `0x${string}`,
        gasUsed: 21000n,
        effectiveGasPrice: 20000000000n,
        status: 'success',
        contractAddress: null
      };
      
      mockPublicClient.sendRawTransaction.mockResolvedValue(txHash);
      mockWaitForConfirmation.mockResolvedValue(mockReceipt);
      
      const result = await broadcastSignedTransaction({
        signedTransaction: signedTx,
        networkName: 'sepolia',
        waitForConfirmation: true,
        confirmations: 2
      });
      
      expect(result.success).toBe(true);
      expect(result.transactionHash).toBe(txHash);
      expect(result.confirmation).toEqual({
        blockNumber: '12345',
        blockHash: '0xblockhash123',
        gasUsed: '21000',
        effectiveGasPrice: '20000000000',
        contractAddress: null,
        status: 'success'
      });
      expect(result.message).toBe('Transaction broadcast and confirmed successfully');
    });

    it('should verify expected transaction hash if provided', async () => {
      const signedTx = '0x02f8720182020a8405f5e100850fbc1405008252089470997970c51812dc3a010c7d01b50e0d17dc79c88080c001a0c4d9e2f3b5a8d7c1f9e6b3a4d2c8f5e7a9b6d4c1f8e3a7b2d5c9f4e8a3b7d2c6a0b8e3f7a2d6c1f5e9b4a8d3c7f2e6b1a5d9c4f8e2a7b3d6c2f7e3a8b4d9c5f1';
      const actualHash = '0xactual1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const expectedHash = '0xexpected567890abcdef1234567890abcdef1234567890abcdef1234567890ab';
      
      mockPublicClient.sendRawTransaction.mockResolvedValue(actualHash);
      
      await expect(broadcastSignedTransaction({
        signedTransaction: signedTx,
        networkName: 'sepolia',
        expectedTransactionHash: expectedHash,
        waitForConfirmation: false
      })).rejects.toThrow(TransactionError);
    });

    it('should handle RPC errors gracefully', async () => {
      const signedTx = '0x02f8720182020a8405f5e100850fbc1405008252089470997970c51812dc3a010c7d01b50e0d17dc79c88080c001a0c4d9e2f3b5a8d7c1f9e6b3a4d2c8f5e7a9b6d4c1f8e3a7b2d5c9f4e8a3b7d2c6a0b8e3f7a2d6c1f5e9b4a8d3c7f2e6b1a5d9c4f8e2a7b3d6c2f7e3a8b4d9c5f1';
      
      mockPublicClient.sendRawTransaction.mockRejectedValue(new Error('insufficient funds for gas'));
      
      await expect(broadcastSignedTransaction({
        signedTransaction: signedTx,
        networkName: 'sepolia',
        waitForConfirmation: false
      })).rejects.toThrow('Failed to broadcast transaction: insufficient funds for gas');
    });

    it('should handle invalid transaction format', async () => {
      await expect(broadcastSignedTransaction({
        signedTransaction: 'invalid_tx_format',
        networkName: 'sepolia',
        waitForConfirmation: false
      })).rejects.toThrow();
    });

    it('should continue even if confirmation fails after broadcast', async () => {
      const signedTx = '0x02f8720182020a8405f5e100850fbc1405008252089470997970c51812dc3a010c7d01b50e0d17dc79c88080c001a0c4d9e2f3b5a8d7c1f9e6b3a4d2c8f5e7a9b6d4c1f8e3a7b2d5c9f4e8a3b7d2c6a0b8e3f7a2d6c1f5e9b4a8d3c7f2e6b1a5d9c4f8e2a7b3d6c2f7e3a8b4d9c5f1';
      const txHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      
      mockPublicClient.sendRawTransaction.mockResolvedValue(txHash);
      mockWaitForConfirmation.mockRejectedValue(new Error('Timeout waiting for confirmation'));
      
      const result = await broadcastSignedTransaction({
        signedTransaction: signedTx,
        networkName: 'sepolia',
        waitForConfirmation: true
      });
      
      expect(result.success).toBe(true);
      expect(result.transactionHash).toBe(txHash);
      expect(result.confirmation).toBeUndefined();
      expect(result.message).toBe('Transaction broadcast successfully. Use wait-for-confirmation to check status.');
    });
  });

  describe('checkTransactionStatus', () => {
    it('should return confirmed status for mined transaction', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const mockReceipt: Partial<TransactionReceipt> = {
        transactionHash: txHash as `0x${string}`,
        blockNumber: 12345n,
        blockHash: '0xblockhash123' as `0x${string}`,
        gasUsed: 21000n,
        effectiveGasPrice: 20000000000n,
        status: 'success',
        contractAddress: '0xcontract123' as `0x${string}`
      };
      
      mockPublicClient.getTransactionReceipt.mockResolvedValue(mockReceipt);
      
      const result = await checkTransactionStatus({
        transactionHash: txHash,
        networkName: 'sepolia'
      });
      
      expect(result).toEqual({
        transactionHash: txHash,
        networkName: 'sepolia',
        explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
        status: 'confirmed',
        blockNumber: '12345',
        blockHash: '0xblockhash123',
        gasUsed: '21000',
        effectiveGasPrice: '20000000000',
        contractAddress: '0xcontract123',
        confirmations: 'Available - use wait-for-confirmation to get exact count',
        message: 'Transaction confirmed successfully'
      });
    });

    it('should return failed status for reverted transaction', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const mockReceipt: Partial<TransactionReceipt> = {
        transactionHash: txHash as `0x${string}`,
        blockNumber: 12345n,
        blockHash: '0xblockhash123' as `0x${string}`,
        gasUsed: 21000n,
        effectiveGasPrice: 20000000000n,
        status: 'reverted',
        contractAddress: null
      };
      
      mockPublicClient.getTransactionReceipt.mockResolvedValue(mockReceipt);
      
      const result = await checkTransactionStatus({
        transactionHash: txHash,
        networkName: 'sepolia'
      });
      
      expect(result.status).toBe('failed');
      expect(result.message).toBe('Transaction failed on blockchain');
    });

    it('should return pending status for unmined transaction', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      mockPublicClient.getTransactionReceipt.mockRejectedValue(new Error('Transaction not found'));
      mockPublicClient.getTransaction.mockResolvedValue({
        hash: txHash,
        blockNumber: null,
        blockHash: null,
        gasPrice: 20000000000n,
        maxFeePerGas: 25000000000n,
        nonce: 5,
        from: '0xsender123',
        to: '0xrecipient456',
        value: 0n
      });
      
      const result = await checkTransactionStatus({
        transactionHash: txHash,
        networkName: 'sepolia'
      });
      
      expect(result).toEqual({
        transactionHash: txHash,
        networkName: 'sepolia',
        explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
        status: 'pending',
        blockNumber: 'pending',
        blockHash: 'pending',
        gasPrice: '20000000000',
        maxFeePerGas: '25000000000',
        nonce: 5,
        message: 'Transaction is pending confirmation'
      });
    });

    it('should return not_found status for non-existent transaction', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      mockPublicClient.getTransactionReceipt.mockRejectedValue(new Error('Transaction not found'));
      mockPublicClient.getTransaction.mockRejectedValue(new Error('Transaction not found'));
      
      const result = await checkTransactionStatus({
        transactionHash: txHash,
        networkName: 'sepolia'
      });
      
      expect(result).toEqual({
        transactionHash: txHash,
        networkName: 'sepolia',
        explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
        status: 'not_found',
        message: 'Transaction not found on the blockchain. It may not have been broadcast yet or the hash may be incorrect.',
        suggestions: [
          'Verify the transaction hash is correct',
          'Check if the transaction was actually broadcast',
          'Wait a few moments and try again if recently broadcast'
        ]
      });
    });

    it('should handle RPC errors gracefully', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      mockPublicClient.getTransactionReceipt.mockRejectedValue(new Error('RPC connection failed'));
      mockPublicClient.getTransaction.mockRejectedValue(new Error('RPC connection failed'));
      
      const result = await checkTransactionStatus({
        transactionHash: txHash,
        networkName: 'sepolia'
      });
      
      expect(result.status).toBe('not_found');
      expect(result.message).toContain('not found on the blockchain');
    });
  });

  describe('waitForConfirmation', () => {
    it('should wait for transaction confirmation successfully', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      const mockReceipt: Partial<TransactionReceipt> = {
        transactionHash: txHash as `0x${string}`,
        blockNumber: 12345n,
        blockHash: '0xblockhash123' as `0x${string}`,
        gasUsed: 21000n,
        effectiveGasPrice: 20000000000n,
        status: 'success',
        contractAddress: '0xcontract123' as `0x${string}`
      };
      
      mockWaitForConfirmation.mockResolvedValue(mockReceipt);
      
      const result = await waitForConfirmation({
        transactionHash: txHash,
        networkName: 'sepolia',
        confirmations: 3
      });
      
      expect(result).toEqual({
        transactionHash: txHash,
        blockNumber: '12345',
        blockHash: '0xblockhash123',
        gasUsed: '21000',
        effectiveGasPrice: '20000000000',
        status: 'success',
        contractAddress: '0xcontract123',
        confirmations: 3,
        networkName: 'sepolia',
        explorerUrl: `https://sepolia.etherscan.io/tx/${txHash}`
      });
    });

    it('should handle timeout while waiting for confirmation', async () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      mockWaitForConfirmation.mockRejectedValue(new Error('Timeout waiting for transaction confirmation'));
      
      await expect(waitForConfirmation({
        transactionHash: txHash,
        networkName: 'sepolia',
        confirmations: 12,
        timeoutMinutes: 1
      })).rejects.toThrow('Failed to confirm transaction: Timeout waiting for transaction confirmation');
    });

    it('should validate input parameters', async () => {
      await expect(waitForConfirmation({
        transactionHash: 'invalid_hash',
        networkName: 'sepolia'
      })).rejects.toThrow();
      
      await expect(waitForConfirmation({
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        networkName: 'sepolia',
        confirmations: 0
      })).rejects.toThrow();
      
      await expect(waitForConfirmation({
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        networkName: 'sepolia',
        confirmations: 21
      })).rejects.toThrow();
    });
  });
});