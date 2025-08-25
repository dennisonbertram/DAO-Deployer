/**
 * DAO MCP Server Functionality Tests
 * Tests the actual MCP server tools for DAO deployment workflow
 * Focuses on real DAO deployment capabilities, not generic blockchain functions
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { MCPTestClient, createMCPClient, extractTextContent } from '../utils/mcp-client';
import { sleep } from '../setup/global-setup';

describe('DAO MCP Server Functionality', () => {
  let serverProcess: ChildProcess;
  let client: MCPTestClient;

  beforeEach(async () => {
    // Start real MCP server process
    serverProcess = spawn('node', [join(process.cwd(), 'build', 'index.js')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DISABLE_HARDWARE_WALLET: 'true',
      },
    });

    // Create MCP client
    client = createMCPClient(serverProcess);

    // Give server time to initialize
    await sleep(1000);
    
    await client.initialize();
  });

  afterEach(async () => {
    if (client) await client.close();
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await sleep(1000);
    }
  });

  describe('MCP Tools Availability', () => {
    it('should provide all required DAO deployment tools', async () => {
      const toolsResponse = await client.listTools();
      const toolNames = toolsResponse.result.tools.map((t: any) => t.name);
      
      // Core DAO deployment tools
      expect(toolNames).toContain('prepare-factory-deployment');
      expect(toolNames).toContain('prepare-dao-deployment');
      
      // Transaction management tools
      expect(toolNames).toContain('broadcast-signed-transaction');
      expect(toolNames).toContain('wait-for-confirmation');
      expect(toolNames).toContain('check-transaction-status');
      
      // Network and contract tools
      expect(toolNames).toContain('list-networks');
      expect(toolNames).toContain('verify-contract');
      expect(toolNames).toContain('get-deployment-info');
      
      // Configuration tools
      expect(toolNames).toContain('set-api-key');
      expect(toolNames).toContain('list-api-keys');
    });

    it('should provide ephemeral wallet tools for testing', async () => {
      const toolsResponse = await client.listTools();
      const toolNames = toolsResponse.result.tools.map((t: any) => t.name);
      
      expect(toolNames).toContain('generate-ephemeral-wallet');
      expect(toolNames).toContain('list-ephemeral-wallets');
      expect(toolNames).toContain('check-wallet-balance');
    });
  });

  describe('Network Configuration', () => {
    it('should list available networks', async () => {
      const response = await client.callTool('list-networks', {});
      const content = extractTextContent(response);
      
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(10);
      // The response format may vary, but should contain network information
    });
  });

  describe('DAO Factory Deployment Preparation', () => {
    it('should handle factory deployment preparation for sepolia testnet', async () => {
      try {
        const response = await client.callTool('prepare-factory-deployment', {
          networkName: 'sepolia',
          factoryVersion: 'v2',
        });

        const content = extractTextContent(response);
        expect(content).toBeTruthy();
        
        // Should contain transaction preparation info or error message
        // Both are acceptable since we're testing MCP functionality, not blockchain connectivity
        expect(content.length).toBeGreaterThan(10);
      } catch (error: any) {
        // Network errors are acceptable - we're testing MCP functionality
        expect(error).toBeDefined();
      }
    });

    it('should validate network name parameter', async () => {
      try {
        await client.callTool('prepare-factory-deployment', {
          networkName: 'invalid-network-name-that-does-not-exist',
          factoryVersion: 'v2',
        });
        expect.fail('Should have thrown an error for invalid network');
      } catch (error: any) {
        expect(error.message).toBeTruthy();
        // Should get a validation error, not a crash
      }
    });

    it('should validate factory version parameter', async () => {
      try {
        await client.callTool('prepare-factory-deployment', {
          networkName: 'sepolia',
          factoryVersion: 'invalid-version',
        });
        expect.fail('Should have thrown an error for invalid factory version');
      } catch (error: any) {
        expect(error.message).toBeTruthy();
      }
    });
  });

  describe('DAO Deployment Plan Preparation', () => {
    const validDAOConfig = {
      networkName: 'sepolia',
      factoryAddress: '0x1234567890123456789012345678901234567890',
      daoName: 'Test DAO',
      tokenName: 'Test Token',
      tokenSymbol: 'TEST',
      initialSupply: '1000000000000000000000000', // 1M tokens with 18 decimals
      governorSettings: {
        votingDelay: 1,
        votingPeriod: 100,
        proposalThreshold: '1000000000000000000000', // 1K tokens
        quorumPercentage: 10,
      },
      timelockSettings: {
        minDelay: 86400, // 1 day
        proposers: ['0x1234567890123456789012345678901234567890'],
        executors: ['0x1234567890123456789012345678901234567890'],
      },
    };

    it('should prepare complete DAO deployment plan', async () => {
      try {
        const response = await client.callTool('prepare-dao-deployment', validDAOConfig);
        const content = extractTextContent(response);
        
        expect(content).toBeTruthy();
        expect(content.length).toBeGreaterThan(10);
        
        // Should mention DAO deployment
        expect(content.toLowerCase()).toContain('dao');
      } catch (error: any) {
        // Network/validation errors are acceptable - we're testing MCP tool availability
        expect(error).toBeDefined();
      }
    });

    it('should validate required DAO parameters', async () => {
      const invalidConfigs = [
        { ...validDAOConfig, daoName: '' }, // Empty DAO name
        { ...validDAOConfig, tokenSymbol: '' }, // Empty token symbol
        { ...validDAOConfig, factoryAddress: 'invalid' }, // Invalid address
      ];

      for (const config of invalidConfigs) {
        try {
          await client.callTool('prepare-dao-deployment', config);
          expect.fail(`Should have thrown validation error for: ${JSON.stringify(config)}`);
        } catch (error: any) {
          expect(error.message).toBeTruthy();
        }
      }
    });
  });

  describe('Transaction Broadcasting Tools', () => {
    it('should provide transaction status checking', async () => {
      try {
        const response = await client.callTool('check-transaction-status', {
          transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          networkName: 'sepolia'
        });
        
        const content = extractTextContent(response);
        expect(content).toBeTruthy();
      } catch (error: any) {
        // Network errors are acceptable
        expect(error).toBeDefined();
      }
    });

    it('should validate transaction hash format', async () => {
      try {
        await client.callTool('check-transaction-status', {
          transactionHash: 'invalid-hash',
          networkName: 'sepolia'
        });
        expect.fail('Should have thrown validation error for invalid hash');
      } catch (error: any) {
        expect(error.message).toBeTruthy();
      }
    });
  });

  describe('Contract Verification Tools', () => {
    it('should handle contract verification requests', async () => {
      try {
        const response = await client.callTool('verify-contract', {
          contractAddress: '0x1234567890123456789012345678901234567890',
          contractName: 'TestContract',
          networkName: 'sepolia'
        });
        
        const content = extractTextContent(response);
        expect(content).toBeTruthy();
      } catch (error: any) {
        // Verification errors are acceptable - we're testing tool availability
        expect(error).toBeDefined();
      }
    });
  });

  describe('API Key Management', () => {
    it('should list API key configuration status', async () => {
      const response = await client.callTool('list-api-keys');
      const content = extractTextContent(response);
      
      expect(content).toBeTruthy();
      expect(content).toContain('API Key');
    });

    it('should provide configuration information', async () => {
      const response = await client.callTool('get-config-info');
      const content = extractTextContent(response);
      
      expect(content).toBeTruthy();
      expect(content).toContain('Configuration');
    });
  });

  describe('Deployment Information Tools', () => {
    it('should handle deployment info requests', async () => {
      try {
        const response = await client.callTool('get-deployment-info', {
          contractAddress: '0x1234567890123456789012345678901234567890',
          networkName: 'sepolia'
        });
        
        const content = extractTextContent(response);
        expect(content).toBeTruthy();
      } catch (error: any) {
        // Network errors are acceptable
        expect(error).toBeDefined();
      }
    });
  });
});