/**
 * Unit tests for MCP resources
 * Tests resource listing and contract source reading functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listResources, readResource } from '../../src/resources/index.js';

// Mock network configuration
vi.mock('../../src/networks/index.js', () => ({
  SUPPORTED_NETWORKS: {
    ethereum: { 
      name: 'ethereum', 
      chainId: 1, 
      testnet: false,
      rpcUrl: 'https://ethereum.infura.io/v3/YOUR_API_KEY'
    },
    sepolia: { 
      name: 'sepolia', 
      chainId: 11155111, 
      testnet: true,
      rpcUrl: 'https://sepolia.infura.io/v3/YOUR_API_KEY'
    },
    polygon: { 
      name: 'polygon', 
      chainId: 137, 
      testnet: false,
      rpcUrl: 'https://polygon.infura.io/v3/YOUR_API_KEY'
    }
  }
}));

// Mock contract utils
vi.mock('../../src/utils/contracts.js', () => ({
  CONTRACT_PATHS: {
    Governor: 'src/Governor.sol',
    Token: 'src/Token.sol',
    Timelock: 'src/Timelock.sol',
    Factory: 'src/Factory.sol'
  },
  loadAllContractABIs: vi.fn()
}));

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn()
  }
}));

// Mock path module
vi.mock('path', () => ({
  join: vi.fn((...parts) => parts.join('/'))
}));

describe('resources', () => {
  let mockLoadAllContractABIs: any;
  let mockReadFile: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Import mocked modules
    const contractUtils = await import('../../src/utils/contracts.js');
    mockLoadAllContractABIs = contractUtils.loadAllContractABIs as any;
    
    const fs = await import('fs');
    mockReadFile = fs.promises.readFile as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listResources', () => {
    it('should list all available resources', async () => {
      const resources = await listResources();
      
      // Check network resources
      expect(resources).toContainEqual({
        uri: 'dao-deployer://networks/all',
        name: 'All Supported Networks',
        description: 'Complete list of all supported blockchain networks with configuration details',
        mimeType: 'application/json'
      });
      
      expect(resources).toContainEqual({
        uri: 'dao-deployer://networks/mainnets',
        name: 'Mainnet Networks',
        description: 'List of supported mainnet blockchain networks',
        mimeType: 'application/json'
      });
      
      expect(resources).toContainEqual({
        uri: 'dao-deployer://networks/testnets',
        name: 'Testnet Networks',
        description: 'List of supported testnet blockchain networks',
        mimeType: 'application/json'
      });
      
      // Check contract ABI resources
      expect(resources).toContainEqual({
        uri: 'dao-deployer://contracts/abi/Governor',
        name: 'Governor ABI',
        description: 'Application Binary Interface for Governor contract',
        mimeType: 'application/json'
      });
      
      // Check contract source resources
      expect(resources).toContainEqual({
        uri: 'dao-deployer://contracts/source/Governor',
        name: 'Governor Source',
        description: 'Solidity source code for Governor contract',
        mimeType: 'text/x-solidity'
      });
      
      // Check template resources
      expect(resources).toContainEqual({
        uri: 'dao-deployer://templates/factory-deployment',
        name: 'Factory Deployment Template',
        description: 'Template configuration for deploying DAO factory contracts',
        mimeType: 'application/json'
      });
      
      // Check documentation resources
      expect(resources).toContainEqual({
        uri: 'dao-deployer://docs/quickstart',
        name: 'Quick Start Guide',
        description: 'Step-by-step guide for deploying your first DAO',
        mimeType: 'text/markdown'
      });
    });

    it('should include resources for all contracts', async () => {
      const resources = await listResources();
      
      const contractNames = ['Governor', 'Token', 'Timelock', 'Factory'];
      
      for (const name of contractNames) {
        expect(resources).toContainEqual(
          expect.objectContaining({
            uri: `dao-deployer://contracts/abi/${name}`,
            name: `${name} ABI`
          })
        );
        
        expect(resources).toContainEqual(
          expect.objectContaining({
            uri: `dao-deployer://contracts/source/${name}`,
            name: `${name} Source`
          })
        );
      }
    });
  });

  describe('readResource', () => {
    describe('network resources', () => {
      it('should read all networks', async () => {
        const content = await readResource('dao-deployer://networks/all');
        const networks = JSON.parse(content);
        
        expect(networks).toHaveProperty('ethereum');
        expect(networks).toHaveProperty('sepolia');
        expect(networks).toHaveProperty('polygon');
        expect(networks.ethereum.chainId).toBe(1);
        expect(networks.sepolia.testnet).toBe(true);
      });

      it('should read mainnet networks only', async () => {
        const content = await readResource('dao-deployer://networks/mainnets');
        const networks = JSON.parse(content);
        
        expect(networks).toHaveProperty('ethereum');
        expect(networks).toHaveProperty('polygon');
        expect(networks).not.toHaveProperty('sepolia');
      });

      it('should read testnet networks only', async () => {
        const content = await readResource('dao-deployer://networks/testnets');
        const networks = JSON.parse(content);
        
        expect(networks).toHaveProperty('sepolia');
        expect(networks).not.toHaveProperty('ethereum');
        expect(networks).not.toHaveProperty('polygon');
      });
    });

    describe('contract ABI resources', () => {
      it('should read contract ABI', async () => {
        const mockABI = {
          Governor: {
            abi: [
              { type: 'function', name: 'propose', inputs: [], outputs: [] },
              { type: 'event', name: 'ProposalCreated', inputs: [] }
            ],
            bytecode: '0x608060'
          }
        };
        
        mockLoadAllContractABIs.mockResolvedValue(mockABI);
        
        const content = await readResource('dao-deployer://contracts/abi/Governor');
        const abi = JSON.parse(content);
        
        expect(abi).toEqual(mockABI.Governor);
        expect(abi.abi).toHaveLength(2);
      });

      it('should throw error for unknown contract ABI', async () => {
        mockLoadAllContractABIs.mockResolvedValue({});
        
        await expect(readResource('dao-deployer://contracts/abi/UnknownContract'))
          .rejects.toThrow('Failed to load ABI for UnknownContract');
      });
    });

    describe('contract source resources', () => {
      it('should read contract source from file', async () => {
        const soliditySource = `pragma solidity ^0.8.19;
contract Governor {
    function propose() external {}
}`;
        
        mockReadFile.mockResolvedValue(soliditySource);
        
        const content = await readResource('dao-deployer://contracts/source/Governor');
        
        expect(content).toBe(soliditySource);
        expect(mockReadFile).toHaveBeenCalled();
      });

      it('should try multiple paths for contract source', async () => {
        mockReadFile
          .mockRejectedValueOnce(new Error('File not found'))
          .mockRejectedValueOnce(new Error('File not found'))
          .mockResolvedValueOnce('contract source');
        
        const content = await readResource('dao-deployer://contracts/source/Governor');
        
        expect(content).toBe('contract source');
        expect(mockReadFile).toHaveBeenCalledTimes(3);
      });

      it('should return informative message when source file not found', async () => {
        mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'));
        
        const content = await readResource('dao-deployer://contracts/source/Governor');
        
        expect(content).toContain('// Solidity source code for Governor');
        expect(content).toContain('// Source file not found at expected locations');
        expect(content).toContain('pragma solidity ^0.8.19;');
      });

      it('should handle unknown contract source', async () => {
        const content = await readResource('dao-deployer://contracts/source/UnknownContract');
        
        expect(content).toContain('// Error loading source for UnknownContract');
      });
    });

    describe('template resources', () => {
      it('should read factory deployment template', async () => {
        const content = await readResource('dao-deployer://templates/factory-deployment');
        const template = JSON.parse(content);
        
        expect(template).toHaveProperty('networkName');
        expect(template).toHaveProperty('factoryVersion');
        expect(template).toHaveProperty('verifyContract');
        expect(template).toHaveProperty('examples');
        expect(template.examples).toHaveProperty('testnet');
        expect(template.examples).toHaveProperty('mainnet');
      });

      it('should read DAO deployment template', async () => {
        const content = await readResource('dao-deployer://templates/dao-deployment');
        const template = JSON.parse(content);
        
        expect(template).toHaveProperty('networkName');
        expect(template).toHaveProperty('daoName');
        expect(template).toHaveProperty('tokenName');
        expect(template).toHaveProperty('tokenSymbol');
        expect(template).toHaveProperty('governorSettings');
        expect(template).toHaveProperty('timelockSettings');
        expect(template.governorSettings).toHaveProperty('votingDelay');
        expect(template.governorSettings).toHaveProperty('votingPeriod');
        expect(template.governorSettings).toHaveProperty('quorumPercentage');
      });
    });

    describe('documentation resources', () => {
      it('should read quickstart guide', async () => {
        const content = await readResource('dao-deployer://docs/quickstart');
        
        expect(content).toContain('DAO Deployer Quick Start Guide');
        expect(content).toContain('Two-Server Architecture');
        expect(content).toContain('Prerequisites');
        expect(content).toContain('prepare-factory-deployment');
        expect(content).toContain('prepare-dao-deployment');
      });

      it('should read hardware wallet guide', async () => {
        const content = await readResource('dao-deployer://docs/hardware-wallets');
        
        expect(content).toContain('Two-Server Hardware Wallet Integration Guide');
        expect(content).toContain('Architecture Overview');
        expect(content).toContain('DAO Deployer MCP Server');
        expect(content).toContain('MCP Ledger Server');
        expect(content).toContain('Security Features');
      });

      it('should read network requirements guide', async () => {
        const content = await readResource('dao-deployer://docs/network-requirements');
        
        expect(content).toContain('Network Requirements Guide');
        expect(content).toContain('Mainnet Networks');
        expect(content).toContain('Testnet Networks');
        expect(content).toContain('Gas Fee Considerations');
        expect(content).toContain('Pre-deployment Checklist');
      });
    });

    describe('error handling', () => {
      it('should throw error for unknown resource URI', async () => {
        await expect(readResource('dao-deployer://unknown/resource'))
          .rejects.toThrow('Resource not found: dao-deployer://unknown/resource');
      });

      it('should throw error for invalid URI format', async () => {
        await expect(readResource('invalid-uri'))
          .rejects.toThrow('Resource not found: invalid-uri');
      });

      it('should handle ABI loading errors', async () => {
        mockLoadAllContractABIs.mockRejectedValue(new Error('Failed to load ABIs'));
        
        await expect(readResource('dao-deployer://contracts/abi/Governor'))
          .rejects.toThrow('Failed to load ABI for Governor: Failed to load ABIs');
      });
    });
  });

  describe('resource content validation', () => {
    it('should provide valid JSON for network resources', async () => {
      const resources = [
        'dao-deployer://networks/all',
        'dao-deployer://networks/mainnets',
        'dao-deployer://networks/testnets'
      ];
      
      for (const uri of resources) {
        const content = await readResource(uri);
        expect(() => JSON.parse(content)).not.toThrow();
      }
    });

    it('should provide valid JSON for template resources', async () => {
      const resources = [
        'dao-deployer://templates/factory-deployment',
        'dao-deployer://templates/dao-deployment'
      ];
      
      for (const uri of resources) {
        const content = await readResource(uri);
        expect(() => JSON.parse(content)).not.toThrow();
      }
    });

    it('should provide valid markdown for documentation resources', async () => {
      const resources = [
        'dao-deployer://docs/quickstart',
        'dao-deployer://docs/hardware-wallets',
        'dao-deployer://docs/network-requirements'
      ];
      
      for (const uri of resources) {
        const content = await readResource(uri);
        expect(content).toContain('#'); // Has markdown headers
        expect(content.length).toBeGreaterThan(100); // Has substantial content
      }
    });
  });
});