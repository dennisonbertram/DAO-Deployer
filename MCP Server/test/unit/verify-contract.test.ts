/**
 * Unit tests for verify-contract tool
 * Tests contract verification via block explorer APIs
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  verifyContract, 
  isContractVerified,
  verifyMultipleContracts,
  formatVerificationResults
} from '../../src/tools/verify-contract.js';
import { VerificationError } from '../../src/types/index.js';

// Mock network configuration
vi.mock('../../src/networks/index.js', () => ({
  getNetworkConfig: vi.fn((networkName: string) => ({
    name: networkName,
    chainId: networkName === 'sepolia' ? 11155111 : 1,
    rpcUrl: `https://${networkName}.infura.io/v3/YOUR_API_KEY`,
    explorerUrl: `https://${networkName}.etherscan.io`,
    explorerApiUrl: `https://api-${networkName}.etherscan.io/api`,
    explorerApiKey: 'test_api_key',
    testnet: networkName === 'sepolia'
  })),
  resolveNetworkConfig: vi.fn((config: any) => Promise.resolve({
    ...config,
    explorerApiKey: 'resolved_api_key'
  }))
}));

// Mock forge utils
vi.mock('../../src/utils/forge.js', () => ({
  verifyContractWithForge: vi.fn()
}));

// Mock contract utils
vi.mock('../../src/utils/contracts.js', () => ({
  getContractSourcePath: vi.fn((name: string) => `src/${name}.sol`),
  ContractName: {}
}));

// Mock global fetch
global.fetch = vi.fn();

describe('verify-contract', () => {
  let mockVerifyWithForge: any;
  let mockFetch: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import mocked modules
    const forgeUtils = await import('../../src/utils/forge.js');
    mockVerifyWithForge = forgeUtils.verifyContractWithForge as any;
    mockFetch = global.fetch as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyContract', () => {
    it('should successfully verify a contract', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      mockVerifyWithForge.mockResolvedValue(undefined);
      
      const result = await verifyContract({
        contractAddress,
        contractName: 'Governor',
        networkName: 'sepolia',
        constructorArgs: ['arg1', 'arg2'],
        force: false
      });
      
      expect(result).toEqual({
        success: true,
        contractAddress,
        networkName: 'sepolia',
        verificationUrl: `https://sepolia.etherscan.io/address/${contractAddress}#code`,
        explorerUrl: 'https://sepolia.etherscan.io'
      });
      
      expect(mockVerifyWithForge).toHaveBeenCalledWith({
        contractAddress,
        contractPath: 'src/Governor.sol',
        contractName: 'Governor',
        constructorArgs: ['arg1', 'arg2'],
        rpcUrl: 'https://sepolia.infura.io/v3/YOUR_API_KEY',
        verifierUrl: 'https://api-sepolia.etherscan.io/api',
        etherscanApiKey: 'resolved_api_key',
        chainId: 11155111
      });
    });

    it('should handle already verified contracts', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      mockVerifyWithForge.mockRejectedValue(new Error('Contract already verified'));
      
      const result = await verifyContract({
        contractAddress,
        contractName: 'Governor',
        networkName: 'sepolia'
      });
      
      expect(result).toEqual({
        success: true,
        contractAddress,
        networkName: 'sepolia',
        verificationUrl: `https://sepolia.etherscan.io/address/${contractAddress}#code`,
        explorerUrl: 'https://sepolia.etherscan.io',
        alreadyVerified: true
      });
    });

    it('should handle contracts with .sol extension in name', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      mockVerifyWithForge.mockResolvedValue(undefined);
      
      const result = await verifyContract({
        contractAddress,
        contractName: 'contracts/Governor.sol:Governor',
        networkName: 'sepolia'
      });
      
      expect(result.success).toBe(true);
      expect(mockVerifyWithForge).toHaveBeenCalledWith(
        expect.objectContaining({
          contractName: 'Governor'
        })
      );
    });

    it('should return error for networks without verification support', async () => {
      const { getNetworkConfig } = await import('../../src/networks/index.js');
      (getNetworkConfig as any).mockReturnValue({
        name: 'local',
        chainId: 31337,
        rpcUrl: 'http://localhost:8545',
        testnet: true
        // No explorerApiUrl or explorerApiKey
      });
      
      const result = await verifyContract({
        contractAddress: '0x1234567890123456789012345678901234567890',
        contractName: 'Governor',
        networkName: 'local'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Contract verification not supported');
    });

    it('should handle verification failures', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      mockVerifyWithForge.mockRejectedValue(new Error('Verification failed: Invalid contract'));
      
      const result = await verifyContract({
        contractAddress,
        contractName: 'Governor',
        networkName: 'sepolia'
      });
      
      expect(result).toEqual({
        success: false,
        contractAddress,
        networkName: 'sepolia',
        error: 'Verification failed: Invalid contract',
        explorerUrl: 'https://sepolia.etherscan.io'
      });
    });

    it('should validate Ethereum address format', async () => {
      const result1 = await verifyContract({
        contractAddress: 'invalid_address',
        contractName: 'Governor',
        networkName: 'sepolia'
      });
      
      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Invalid Ethereum address format');
      
      const result2 = await verifyContract({
        contractAddress: '0x123', // Too short
        contractName: 'Governor',
        networkName: 'sepolia'
      });
      
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Invalid Ethereum address format');
    });
  });

  describe('isContractVerified', () => {
    it('should return true for verified contract', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: '1',
          result: [{
            SourceCode: 'pragma solidity ^0.8.0; contract Test {}',
            ContractName: 'Test',
            CompilerVersion: 'v0.8.19'
          }]
        })
      });
      
      const result = await isContractVerified(contractAddress, 'sepolia');
      
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api-sepolia.etherscan.io/api?module=contract&action=getsourcecode&address=0x1234567890123456789012345678901234567890&apikey=resolved_api_key'
      );
    });

    it('should return false for unverified contract', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: '1',
          result: [{
            SourceCode: '',
            ContractName: '',
            CompilerVersion: ''
          }]
        })
      });
      
      const result = await isContractVerified(contractAddress, 'sepolia');
      
      expect(result).toBe(false);
    });

    it('should return false when API call fails', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });
      
      const result = await isContractVerified(contractAddress, 'sepolia');
      
      expect(result).toBe(false);
    });

    it('should return false for invalid API response', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: '0',
          message: 'NOTOK',
          result: 'Invalid address format'
        })
      });
      
      const result = await isContractVerified(contractAddress, 'sepolia');
      
      expect(result).toBe(false);
    });

    it('should return false for networks without API support', async () => {
      const { getNetworkConfig } = await import('../../src/networks/index.js');
      (getNetworkConfig as any).mockReturnValue({
        name: 'local',
        chainId: 31337,
        rpcUrl: 'http://localhost:8545',
        testnet: true
        // No explorerApiUrl
      });
      
      const result = await isContractVerified('0x1234567890123456789012345678901234567890', 'local');
      
      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const result = await isContractVerified(contractAddress, 'sepolia');
      
      expect(result).toBe(false);
    });
  });

  describe('verifyMultipleContracts', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should verify multiple contracts in sequence', async () => {
      const contracts = [
        { address: '0x1234567890123456789012345678901234567890', name: 'Governor' },
        { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Token' },
        { address: '0x9876543210987654321098765432109876543210', name: 'Timelock' }
      ];
      
      mockVerifyWithForge.mockResolvedValue(undefined);
      
      const resultPromise = verifyMultipleContracts(contracts, 'sepolia');
      
      // Fast-forward through delays
      for (let i = 0; i < contracts.length - 1; i++) {
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(3000);
      }
      
      const results = await resultPromise;
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockVerifyWithForge).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure', async () => {
      const contracts = [
        { address: '0x1234567890123456789012345678901234567890', name: 'Governor' },
        { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Token' }
      ];
      
      mockVerifyWithForge
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Verification failed'));
      
      const resultPromise = verifyMultipleContracts(contracts, 'sepolia');
      
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(3000);
      
      const results = await resultPromise;
      
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Verification failed');
    });

    it('should include constructor args when provided', async () => {
      const contracts = [
        { 
          address: '0x1234567890123456789012345678901234567890', 
          name: 'Governor',
          constructorArgs: ['arg1', 'arg2']
        }
      ];
      
      mockVerifyWithForge.mockResolvedValue(undefined);
      
      const results = await verifyMultipleContracts(contracts, 'sepolia');
      
      expect(results[0].success).toBe(true);
      expect(mockVerifyWithForge).toHaveBeenCalledWith(
        expect.objectContaining({
          constructorArgs: ['arg1', 'arg2']
        })
      );
    });
  });

  describe('formatVerificationResults', () => {
    it('should format single successful verification', () => {
      const result = {
        success: true,
        contractAddress: '0x1234567890123456789012345678901234567890',
        networkName: 'sepolia',
        verificationUrl: 'https://sepolia.etherscan.io/address/0x1234567890123456789012345678901234567890#code',
        explorerUrl: 'https://sepolia.etherscan.io'
      };
      
      const formatted = formatVerificationResults([result]);
      
      expect(formatted).toContain('Contract Verification Result');
      expect(formatted).toContain('✅ Verified');
      expect(formatted).toContain(result.contractAddress);
      expect(formatted).toContain(result.verificationUrl);
    });

    it('should format single failed verification', () => {
      const result = {
        success: false,
        contractAddress: '0x1234567890123456789012345678901234567890',
        networkName: 'sepolia',
        error: 'Invalid contract source',
        explorerUrl: 'https://sepolia.etherscan.io'
      };
      
      const formatted = formatVerificationResults([result]);
      
      expect(formatted).toContain('❌ Failed');
      expect(formatted).toContain('Invalid contract source');
      expect(formatted).toContain('Troubleshooting');
    });

    it('should format already verified contract', () => {
      const result = {
        success: true,
        contractAddress: '0x1234567890123456789012345678901234567890',
        networkName: 'sepolia',
        verificationUrl: 'https://sepolia.etherscan.io/address/0x1234567890123456789012345678901234567890#code',
        explorerUrl: 'https://sepolia.etherscan.io',
        alreadyVerified: true
      };
      
      const formatted = formatVerificationResults([result]);
      
      expect(formatted).toContain('Contract was already verified');
    });

    it('should format batch verification results', () => {
      const results = [
        {
          success: true,
          contractAddress: '0x1234567890123456789012345678901234567890',
          networkName: 'sepolia',
          verificationUrl: 'https://sepolia.etherscan.io/address/0x1234567890123456789012345678901234567890#code',
          explorerUrl: 'https://sepolia.etherscan.io'
        },
        {
          success: false,
          contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          networkName: 'sepolia',
          error: 'Verification failed',
          explorerUrl: 'https://sepolia.etherscan.io'
        }
      ];
      
      const formatted = formatVerificationResults(results);
      
      expect(formatted).toContain('Batch Verification Results (1/2)');
      expect(formatted).toContain('✅ Verified');
      expect(formatted).toContain('❌ Failed');
      expect(formatted).toContain('Failed Verifications');
    });
  });
});