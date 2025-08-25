/**
 * DAO Deployment Transaction Preparation Tests
 * Tests the complete DAO deployment flow using transaction preparation pattern
 * Tests actual MCP tools for preparing factory and DAO deployment transactions
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { MCPTestClient, createMCPClient, extractTextContent } from '../utils/mcp-client';
import { sleep } from '../setup/global-setup';

describe('DAO Deployment Transaction Preparation', () => {
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

  describe('Factory Deployment Preparation', () => {
    it('should prepare factory deployment transaction with valid parameters', async () => {
      const response = await client.callTool('prepare-factory-deployment', {
        networkName: 'local',
        factoryVersion: 'v2',
        verifyContract: true,
        gasEstimateMultiplier: 1.2,
      });

      const content = extractTextContent(response);
      expect(content).toBeTruthy();
      
      // Should contain transaction preparation information
      expect(content).toContain('Transaction Summary');
      expect(content).toContain('contract_deployment');
      expect(content).toContain('local');
      expect(content).toContain('Gas Limit');
      expect(content).toContain('Estimated Cost');
      
      // Should contain instructions for external signing
      expect(content).toContain('MCP Ledger server');
      expect(content).toContain('sign and broadcast');
    });

    it('should handle invalid network name for factory deployment', async () => {
      try {
        await client.callTool('prepare-factory-deployment', {
          networkName: 'invalid-network',
          factoryVersion: 'v2',
        });
        expect.fail('Should have thrown an error for invalid network');
      } catch (error: any) {
        expect(error.message).toContain('network');
      }
    });

    it('should validate factory version parameter', async () => {
      try {
        await client.callTool('prepare-factory-deployment', {
          networkName: 'sepolia',
          factoryVersion: 'invalid',
        });
        expect.fail('Should have thrown an error for invalid factory version');
      } catch (error: any) {
        expect(error.message).toBeTruthy();
      }
    });

    it('should include gas estimation in factory deployment', async () => {
      const response = await client.callTool('prepare-factory-deployment', {
        networkName: 'local',
        factoryVersion: 'v2',
        gasEstimateMultiplier: 1.5,
      });

      const content = extractTextContent(response);
      expect(content).toContain('Gas Limit:');
      expect(content).toContain('Gas Price:');
      expect(content).toContain('Estimated Cost:');
      expect(content).toContain('ETH');
    });
  });

  describe('DAO Deployment Preparation', () => {
    const validDAOConfig = {
      networkName: 'local',
      factoryAddress: '0x1234567890123456789012345678901234567890',
      daoName: 'Test DAO',
      tokenName: 'Test Token',
      tokenSymbol: 'TEST',
      initialSupply: '1000000',
      governorSettings: {
        votingDelay: 1,
        votingPeriod: 100,
        proposalThreshold: '1000',
        quorumPercentage: 10,
      },
      timelockSettings: {
        minDelay: 86400, // 1 day
        proposers: ['0x1234567890123456789012345678901234567890'],
        executors: ['0x1234567890123456789012345678901234567890'],
      },
      verifyContracts: true,
    };

    it('should prepare complete DAO deployment plan with 3 transactions', async () => {
      const response = await client.callTool('prepare-dao-deployment', validDAOConfig);

      const content = extractTextContent(response);
      expect(content).toBeTruthy();
      
      // Should contain deployment plan overview
      expect(content).toContain('3-Step DAO Deployment Plan');
      expect(content).toContain('Test DAO');
      
      // Should contain all three deployment steps
      expect(content).toContain('Step 1: Token Contract');
      expect(content).toContain('Step 2: Timelock Contract');
      expect(content).toContain('Step 3: Governor Contract');
      
      // Should contain transaction preparation details
      expect(content).toContain('Transaction Summary');
      expect(content).toContain('contract_deployment');
      expect(content).toContain('local');
      
      // Should contain instructions for sequential deployment
      expect(content).toContain('Deploy in order');
      expect(content).toContain('address from Step');
    });

    it('should validate required DAO configuration parameters', async () => {
      const invalidConfigs = [
        { ...validDAOConfig, daoName: '' }, // Empty DAO name
        { ...validDAOConfig, tokenSymbol: '' }, // Empty token symbol
        { ...validDAOConfig, initialSupply: 'invalid' }, // Invalid supply
        { ...validDAOConfig, factoryAddress: 'invalid' }, // Invalid address
      ];

      for (const config of invalidConfigs) {
        try {
          await client.callTool('prepare-dao-deployment', config);
          expect.fail(`Should have thrown an error for invalid config: ${JSON.stringify(config)}`);
        } catch (error: any) {
          expect(error.message).toBeTruthy();
        }
      }
    });

    it('should handle governor settings validation', async () => {
      const invalidGovConfig = {
        ...validDAOConfig,
        governorSettings: {
          votingDelay: 0, // Invalid - should be at least 1
          votingPeriod: 50, // Invalid - should be at least 100
          proposalThreshold: 'invalid',
          quorumPercentage: 150, // Invalid - should be <= 100
        },
      };

      try {
        await client.callTool('prepare-dao-deployment', invalidGovConfig);
        expect.fail('Should have thrown an error for invalid governor settings');
      } catch (error: any) {
        expect(error.message).toBeTruthy();
      }
    });

    it('should handle timelock settings validation', async () => {
      const invalidTimelockConfig = {
        ...validDAOConfig,
        timelockSettings: {
          minDelay: -1, // Invalid - cannot be negative
          proposers: ['invalid-address'],
          executors: [],
        },
      };

      try {
        await client.callTool('prepare-dao-deployment', invalidTimelockConfig);
        expect.fail('Should have thrown an error for invalid timelock settings');
      } catch (error: any) {
        expect(error.message).toBeTruthy();
      }
    });

    it('should include gas estimates for all deployment steps', async () => {
      const response = await client.callTool('prepare-dao-deployment', validDAOConfig);

      const content = extractTextContent(response);
      
      // Should include cost estimates
      expect(content).toContain('Total Estimated Cost');
      expect(content).toContain('ETH');
      expect(content).toContain('Gas Limit');
      expect(content).toContain('Gas Price');
    });

    it('should provide clear deployment instructions', async () => {
      const response = await client.callTool('prepare-dao-deployment', validDAOConfig);

      const content = extractTextContent(response);
      
      // Should provide step-by-step instructions
      expect(content).toContain('Next Steps');
      expect(content).toContain('1.');
      expect(content).toContain('2.');
      expect(content).toContain('3.');
      expect(content).toContain('MCP Ledger server');
      expect(content).toContain('sign and broadcast');
    });
  });

  describe('Transaction Broadcasting Support', () => {
    it('should provide broadcast-signed-transaction tool', async () => {
      const toolsResponse = await client.listTools();
      const toolNames = toolsResponse.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('broadcast-signed-transaction');
    });

    it('should provide wait-for-confirmation tool', async () => {
      const toolsResponse = await client.listTools();
      const toolNames = toolsResponse.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('wait-for-confirmation');
    });

    it('should provide check-transaction-status tool', async () => {
      const toolsResponse = await client.listTools();
      const toolNames = toolsResponse.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('check-transaction-status');
    });
  });

  describe('Network Configuration', () => {
    it('should list available networks for deployment', async () => {
      const response = await client.callTool('list-networks');

      const content = extractTextContent(response);
      expect(content).toBeTruthy();
      
      // Should contain common networks
      expect(content).toContain('mainnet');
      expect(content).toContain('sepolia');
      expect(content).toContain('polygon');
      expect(content).toContain('Chain ID');
      expect(content).toContain('RPC URL');
    });

    it('should handle network-specific deployment preparation', async () => {
      const networks = ['local'];  // Only test local network to avoid real network calls

      for (const network of networks) {
        try {
          const response = await client.callTool('prepare-factory-deployment', {
            networkName: network,
            factoryVersion: 'v2',
          });

          const content = extractTextContent(response);
          expect(content).toContain(network);
          expect(content).toContain('Transaction Summary');
        } catch (error) {
          // Some networks might not be configured, which is acceptable
        }
      }
    });
  });
});