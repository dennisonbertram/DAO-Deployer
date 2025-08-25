/**
 * Unit tests for deployment-info tool
 * Tests contract information retrieval including ABI fetching and deployment transaction discovery
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getDeploymentInfo,
  getBatchDeploymentInfo,
  formatDeploymentInfo,
  formatBatchDeploymentInfo
} from '../../src/tools/deployment-info.js';
import type { Address } from 'viem';

// Mock viem module
vi.mock('viem', () => ({
  createPublicClient: vi.fn(),
  http: vi.fn(),
  formatEther: vi.fn((val) => (Number(val) / 1e18).toString())
}));

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

// Mock contract utils
vi.mock('../../src/utils/contracts.js', () => ({
  loadContractABI: vi.fn(),
  loadAllContractABIs: vi.fn(),
  ContractName: {}
}));

// Mock global fetch
global.fetch = vi.fn();

describe('deployment-info', () => {
  let mockPublicClient: any;
  let mockHttp: any;
  let mockCreatePublicClient: any;
  let mockFetch: any;
  let mockLoadContractABI: any;
  let mockLoadAllContractABIs: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import mocked viem
    const viem = await import('viem');
    mockHttp = vi.fn(() => 'http_transport');
    mockCreatePublicClient = vi.fn();
    
    // Create mock public client
    mockPublicClient = {
      getBytecode: vi.fn(),
      getBlockNumber: vi.fn(),
      getBlock: vi.fn(),
      getTransactionReceipt: vi.fn()
    };
    
    mockCreatePublicClient.mockReturnValue(mockPublicClient);
    (viem.createPublicClient as any) = mockCreatePublicClient;
    (viem.http as any) = mockHttp;
    
    // Import mocked contract utils
    const contractUtils = await import('../../src/utils/contracts.js');
    mockLoadContractABI = contractUtils.loadContractABI as any;
    mockLoadAllContractABIs = contractUtils.loadAllContractABIs as any;
    
    mockFetch = global.fetch as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getDeploymentInfo', () => {
    it('should retrieve information for a deployed contract', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const bytecode = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe';
      
      mockPublicClient.getBytecode.mockResolvedValue(bytecode);
      mockPublicClient.getBlockNumber.mockResolvedValue(12345n);
      
      const result = await getDeploymentInfo({
        contractAddress,
        networkName: 'sepolia',
        includeABI: false,
        includeTransactionDetails: false,
        checkVerification: false
      });
      
      expect(result).toEqual({
        contractAddress,
        networkName: 'sepolia',
        networkDetails: {
          chainId: 11155111,
          name: 'sepolia',
          explorerUrl: 'https://sepolia.etherscan.io'
        },
        contractDetails: {
          bytecode,
          isContract: true,
          codeSize: (bytecode.length - 2) / 2,
          verificationUrl: `https://sepolia.etherscan.io/address/${contractAddress}#code`
        }
      });
    });

    it('should detect non-contract addresses', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      
      mockPublicClient.getBytecode.mockResolvedValue('0x');
      mockPublicClient.getBlockNumber.mockResolvedValue(12345n);
      
      const result = await getDeploymentInfo({
        contractAddress,
        networkName: 'sepolia'
      });
      
      expect(result.contractDetails.isContract).toBe(false);
      expect(result.contractDetails.codeSize).toBe(0);
      expect(result.error).toBe('Address does not contain a contract (no bytecode found)');
    });

    it('should find deployment transaction when requested', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const bytecode = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe';
      
      mockPublicClient.getBytecode.mockResolvedValue(bytecode);
      mockPublicClient.getBlockNumber.mockResolvedValue(12350n);
      
      // Mock block with transaction
      mockPublicClient.getBlock.mockResolvedValue({
        number: 12345n,
        timestamp: 1700000000n,
        transactions: [{
          hash: '0xtxhash123',
          from: '0xdeployer123',
          to: null, // Contract creation
          value: 0n,
          gasPrice: 20000000000n
        }]
      });
      
      // Mock transaction receipt
      mockPublicClient.getTransactionReceipt.mockResolvedValue({
        blockNumber: 12345n,
        contractAddress: contractAddress as Address,
        gasUsed: 150000n
      });
      
      const result = await getDeploymentInfo({
        contractAddress,
        networkName: 'sepolia',
        includeTransactionDetails: true
      });
      
      expect(result.deploymentTransaction).toEqual({
        hash: '0xtxhash123',
        blockNumber: 12345n,
        timestamp: new Date(1700000000 * 1000),
        deployer: '0xdeployer123',
        gasUsed: 150000n,
        gasPrice: 20000000000n,
        value: 0n
      });
    });

    it('should fetch ABI from block explorer when available', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const bytecode = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe';
      const mockABI = [
        { type: 'function', name: 'transfer', inputs: [], outputs: [] },
        { type: 'event', name: 'Transfer', inputs: [] }
      ];
      
      mockPublicClient.getBytecode.mockResolvedValue(bytecode);
      mockPublicClient.getBlockNumber.mockResolvedValue(12345n);
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          status: '1',
          result: JSON.stringify(mockABI)
        })
      });
      
      const result = await getDeploymentInfo({
        contractAddress,
        networkName: 'sepolia',
        includeABI: true
      });
      
      expect(result.abi).toEqual(mockABI);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('module=contract&action=getabi')
      );
    });

    it('should match bytecode against known contracts', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const bytecode = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe';
      const mockABI = [{ type: 'function', name: 'vote', inputs: [], outputs: [] }];
      
      mockPublicClient.getBytecode.mockResolvedValue(bytecode);
      mockPublicClient.getBlockNumber.mockResolvedValue(12345n);
      
      mockLoadAllContractABIs.mockResolvedValue({
        Governor: {
          abi: mockABI,
          bytecode: bytecode // Matching bytecode
        }
      });
      
      const result = await getDeploymentInfo({
        contractAddress,
        networkName: 'sepolia',
        includeABI: true
      });
      
      expect(result.abi).toEqual(mockABI);
    });

    it('should handle ABI fetch failures gracefully', async () => {
      const contractAddress = '0x1234567890123456789012345678901234567890';
      const bytecode = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe';
      
      mockPublicClient.getBytecode.mockResolvedValue(bytecode);
      mockPublicClient.getBlockNumber.mockResolvedValue(12345n);
      
      mockFetch.mockRejectedValue(new Error('Network error'));
      mockLoadAllContractABIs.mockResolvedValue({});
      
      const result = await getDeploymentInfo({
        contractAddress,
        networkName: 'sepolia',
        includeABI: true
      });
      
      expect(result.abi).toBeUndefined();
      expect(result.contractDetails.isContract).toBe(true);
    });

    it('should validate Ethereum address format', async () => {
      await expect(getDeploymentInfo({
        contractAddress: 'invalid_address',
        networkName: 'sepolia'
      })).rejects.toThrow();
      
      await expect(getDeploymentInfo({
        contractAddress: '0x123', // Too short
        networkName: 'sepolia'
      })).rejects.toThrow();
    });
  });

  describe('getBatchDeploymentInfo', () => {
    it('should get info for multiple contracts', async () => {
      const contracts = [
        { address: '0x1234567890123456789012345678901234567890' },
        { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' }
      ];
      
      const bytecode = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe';
      
      mockPublicClient.getBytecode.mockResolvedValue(bytecode);
      mockPublicClient.getBlockNumber.mockResolvedValue(12345n);
      
      const results = await getBatchDeploymentInfo(contracts, 'sepolia');
      
      expect(results).toHaveLength(2);
      expect(results[0].contractAddress).toBe(contracts[0].address);
      expect(results[1].contractAddress).toBe(contracts[1].address);
      expect(results.every(r => r.contractDetails.isContract)).toBe(true);
    });

    it('should handle mixed valid and invalid contracts', async () => {
      const contracts = [
        { address: '0x1234567890123456789012345678901234567890' },
        { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' }
      ];
      
      mockPublicClient.getBytecode
        .mockResolvedValueOnce('0x608060405234801561001057600080fd5b50')
        .mockResolvedValueOnce('0x'); // No bytecode
      
      mockPublicClient.getBlockNumber.mockResolvedValue(12345n);
      
      const results = await getBatchDeploymentInfo(contracts, 'sepolia');
      
      expect(results).toHaveLength(2);
      expect(results[0].contractDetails.isContract).toBe(true);
      expect(results[1].contractDetails.isContract).toBe(false);
      expect(results[1].error).toContain('no bytecode found');
    });

    it('should handle network errors gracefully', async () => {
      const contracts = [
        { address: '0x1234567890123456789012345678901234567890' }
      ];
      
      mockPublicClient.getBytecode.mockRejectedValue(new Error('RPC error'));
      
      const results = await getBatchDeploymentInfo(contracts, 'sepolia');
      
      expect(results).toHaveLength(1);
      expect(results[0].error).toBe('RPC error');
      expect(results[0].contractDetails.isContract).toBe(false);
    });
  });

  describe('formatDeploymentInfo', () => {
    it('should format successful deployment info', () => {
      const info = {
        contractAddress: '0x1234567890123456789012345678901234567890',
        networkName: 'sepolia',
        networkDetails: {
          chainId: 11155111,
          name: 'sepolia',
          explorerUrl: 'https://sepolia.etherscan.io'
        },
        contractDetails: {
          bytecode: '0x608060405234801561001057600080fd5b50',
          isContract: true,
          codeSize: 20,
          verificationUrl: 'https://sepolia.etherscan.io/address/0x1234567890123456789012345678901234567890#code'
        },
        deploymentTransaction: {
          hash: '0xtxhash123',
          blockNumber: 12345n,
          timestamp: new Date('2024-01-01T00:00:00Z'),
          deployer: '0xdeployer123',
          gasUsed: 150000n,
          gasPrice: 20000000000n,
          value: 1000000000000000000n
        },
        abi: [
          { type: 'function', name: 'transfer' },
          { type: 'event', name: 'Transfer' }
        ]
      };
      
      const formatted = formatDeploymentInfo(info);
      
      expect(formatted).toContain('Contract Deployment Information');
      expect(formatted).toContain('0x1234567890123456789012345678901234567890');
      expect(formatted).toContain('✅ Yes');
      expect(formatted).toContain('20 bytes');
      expect(formatted).toContain('0xtxhash123');
      expect(formatted).toContain('**Functions:** 1');
      expect(formatted).toContain('**Events:** 1');
    });

    it('should format error deployment info', () => {
      const info = {
        contractAddress: '0x1234567890123456789012345678901234567890',
        networkName: 'sepolia',
        networkDetails: {
          chainId: 11155111,
          name: 'sepolia',
          explorerUrl: 'https://sepolia.etherscan.io'
        },
        contractDetails: {
          bytecode: '0x',
          isContract: false,
          codeSize: 0
        },
        error: 'Address does not contain a contract'
      };
      
      const formatted = formatDeploymentInfo(info);
      
      expect(formatted).toContain('❌ Error');
      expect(formatted).toContain('Address does not contain a contract');
    });

    it('should handle missing deployment transaction', () => {
      const info = {
        contractAddress: '0x1234567890123456789012345678901234567890',
        networkName: 'sepolia',
        networkDetails: {
          chainId: 11155111,
          name: 'sepolia'
        },
        contractDetails: {
          bytecode: '0x608060',
          isContract: true,
          codeSize: 3
        }
      };
      
      const formatted = formatDeploymentInfo(info);
      
      expect(formatted).toContain('⚠️  Deployment transaction not found');
    });

    it('should handle missing ABI', () => {
      const info = {
        contractAddress: '0x1234567890123456789012345678901234567890',
        networkName: 'sepolia',
        networkDetails: {
          chainId: 11155111,
          name: 'sepolia'
        },
        contractDetails: {
          bytecode: '0x608060',
          isContract: true,
          codeSize: 3
        }
      };
      
      const formatted = formatDeploymentInfo(info);
      
      expect(formatted).toContain('⚠️  Contract ABI not available');
    });
  });

  describe('formatBatchDeploymentInfo', () => {
    it('should format batch deployment info', () => {
      const infos = [
        {
          contractAddress: '0x1234567890123456789012345678901234567890',
          networkName: 'sepolia',
          networkDetails: {
            chainId: 11155111,
            name: 'sepolia',
            explorerUrl: 'https://sepolia.etherscan.io'
          },
          contractDetails: {
            bytecode: '0x608060',
            isContract: true,
            codeSize: 1024
          }
        },
        {
          contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          networkName: 'sepolia',
          networkDetails: {
            chainId: 11155111,
            name: 'sepolia',
            explorerUrl: 'https://sepolia.etherscan.io'
          },
          contractDetails: {
            bytecode: '0x',
            isContract: false,
            codeSize: 0
          }
        }
      ];
      
      const formatted = formatBatchDeploymentInfo(infos);
      
      expect(formatted).toContain('Batch Deployment Information (1/2 contracts)');
      expect(formatted).toContain('0x1234...7890');
      expect(formatted).toContain('0xabcd...abcd');
      expect(formatted).toContain('1.0KB');
      expect(formatted).toContain('✅');
      expect(formatted).toContain('❌');
      expect(formatted).toContain('**Total Code Size:** 1.0 KB');
    });
  });
});