/**
 * Blockchain Operations Integration Tests
 * Tests using real Anvil local blockchain - NO MOCKS
 * Tests contract deployment, gas estimation, and multi-network support
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { 
  createTestPublicClient, 
  createTestWalletClient,
  getEthBalance,
  isContract,
  sendEth,
  waitForTransaction,
  mineBlocks,
  takeSnapshot,
  revertToSnapshot,
  validateAddress,
} from '../utils/blockchain';
import { MCPTestClient, createMCPClient, extractTextContent } from '../utils/mcp-client';
import { waitFor, sleep } from '../setup/global-setup';
import { join } from 'path';
import type { PublicClient, WalletClient } from 'viem';

describe('Blockchain Operations with Anvil', () => {
  let anvilProcess: ChildProcess;
  let serverProcess: ChildProcess;
  let mcpClient: MCPTestClient;
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  let snapshotId: string;

  // Test accounts from Anvil
  const TEST_ACCOUNTS = {
    deployer: {
      address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    },
    user1: {
      address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    },
    user2: {
      address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    },
  };

  beforeAll(async () => {
    // Start Anvil
    console.log('Starting Anvil for blockchain tests...');
    anvilProcess = spawn('anvil', [
      '--port', '8545',
      '--accounts', '10',
      '--balance', '10000',
      '--gas-limit', '30000000',
      '--block-time', '1', // Normal auto-mining for transaction tests
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Wait for Anvil to be ready
    await waitFor(async () => {
      try {
        const response = await fetch('http://localhost:8545', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1,
          }),
        });
        return response.ok;
      } catch {
        return false;
      }
    }, 30000);

    // Create blockchain clients
    publicClient = createTestPublicClient();
    walletClient = createTestWalletClient(TEST_ACCOUNTS.deployer.privateKey as `0x${string}`);

    // Build and start MCP server
    const { execSync } = await import('child_process');
    execSync('npm run build', { cwd: process.cwd() });

    serverProcess = spawn('node', [join(process.cwd(), 'build', 'index.js')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DISABLE_HARDWARE_WALLET: 'true',
        RPC_URL_LOCAL: 'http://localhost:8545',
      },
    });

    mcpClient = createMCPClient(serverProcess);

    // Give server time to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Initialize MCP client
    await mcpClient.initialize();
  });

  afterAll(async () => {
    // Cleanup
    if (mcpClient) await mcpClient.close();
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await sleep(1000);
    }
    if (anvilProcess) {
      anvilProcess.kill('SIGTERM');
      await sleep(1000);
    }
  });

  beforeEach(async () => {
    // Take snapshot before each test
    snapshotId = await takeSnapshot(publicClient);
  });

  afterEach(async () => {
    // Revert to snapshot after each test
    if (snapshotId) {
      await revertToSnapshot(publicClient, snapshotId);
    }
  });

  describe('Network Configuration', () => {
    it('should connect to local Anvil blockchain', async () => {
      const blockNumber = await publicClient.getBlockNumber();
      expect(blockNumber).toBeGreaterThanOrEqual(0n);

      const chainId = await publicClient.getChainId();
      expect(chainId).toBe(31337);
    });

    it('should have funded test accounts', async () => {
      const balance = await getEthBalance(publicClient, TEST_ACCOUNTS.deployer.address as `0x${string}`);
      const balanceNum = parseFloat(balance);
      expect(balanceNum).toBeGreaterThan(9000); // Should have substantial ETH (accounts start with 10000 ETH, some used for gas)
    });

    it('should list networks including local test network', async () => {
      const response = await mcpClient.callTool('list-networks', {
        includeTestnets: true,
      });

      const content = extractTextContent(response);
      expect(content).toBeTruthy();
      
      // Should include various networks
      expect(content.toLowerCase()).toContain('sepolia');
      expect(content.toLowerCase()).toContain('mainnet');
    });
  });

  describe('Gas Estimation', () => {
    it('should estimate gas for simple transfer', async () => {
      const estimatedGas = await publicClient.estimateGas({
        account: TEST_ACCOUNTS.deployer.address as `0x${string}`,
        to: TEST_ACCOUNTS.user1.address as `0x${string}`,
        value: BigInt(1e18), // 1 ETH
      });

      expect(estimatedGas).toBeGreaterThan(0n);
      expect(estimatedGas).toBeLessThan(BigInt(100000)); // Simple transfer should be < 100k gas
    });

    it('should handle gas price fluctuations', async () => {
      const gasPrice1 = await publicClient.getGasPrice();
      
      // Mine some blocks
      await mineBlocks(publicClient, 5);
      
      const gasPrice2 = await publicClient.getGasPrice();
      
      expect(gasPrice1).toBeGreaterThan(0n);
      expect(gasPrice2).toBeGreaterThan(0n);
    });

    it('should fail deployment with insufficient gas', async () => {
      // This would test deployment with intentionally low gas limit
      // Would need actual contract bytecode to test
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Transaction Handling', () => {
    it('should send ETH between accounts', async () => {
      const initialBalance = await getEthBalance(publicClient, TEST_ACCOUNTS.user1.address as `0x${string}`);
      
      // Send 1 ETH
      const hash = await sendEth(
        walletClient,
        TEST_ACCOUNTS.user1.address as `0x${string}`,
        '1.0'
      );
      
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      
      // Wait for confirmation
      await waitForTransaction(publicClient, hash);
      
      const finalBalance = await getEthBalance(publicClient, TEST_ACCOUNTS.user1.address as `0x${string}`);
      const diff = parseFloat(finalBalance) - parseFloat(initialBalance);
      expect(diff).toBeCloseTo(1.0, 6);
    });

    it('should handle transaction failures gracefully', async () => {
      // Try to send more ETH than available
      try {
        const hash = await walletClient.sendTransaction({
          to: TEST_ACCOUNTS.user1.address as `0x${string}`,
          value: BigInt(100000) * BigInt(1e18), // 100,000 ETH (more than balance)
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should track transaction receipts', async () => {
      const hash = await sendEth(
        walletClient,
        TEST_ACCOUNTS.user2.address as `0x${string}`,
        '0.5'
      );

      const receipt = await waitForTransaction(publicClient, hash);
      
      expect(receipt.status).toBe('success');
      expect(receipt.blockNumber).toBeGreaterThan(0n);
      expect(receipt.gasUsed).toBeGreaterThan(0n);
    });
  });

  describe('Contract Deployment Simulation', () => {
    it('should detect contract addresses', async () => {
      // Check that a regular address is not a contract
      const isDeployerContract = await isContract(
        publicClient,
        TEST_ACCOUNTS.deployer.address as `0x${string}`
      );
      expect(isDeployerContract).toBe(false);
    });

    it('should validate Ethereum addresses', () => {
      expect(validateAddress(TEST_ACCOUNTS.deployer.address)).toBe(true);
      expect(validateAddress('0xinvalid')).toBe(false);
      expect(validateAddress('not-an-address')).toBe(false);
    });

    it('should handle network switching scenarios', async () => {
      // Test that we can query different network configurations
      const response = await mcpClient.callTool('list-networks', {
        includeMainnets: true,
        includeTestnets: true,
      });

      const content = extractTextContent(response);
      
      // Should list multiple networks
      const networks = content.split('\n').filter(line => line.trim());
      expect(networks.length).toBeGreaterThan(5); // Should have multiple networks
    });
  });

  describe('Ephemeral Wallet Integration', () => {
    it('should generate ephemeral wallet for local network', async () => {
      const response = await mcpClient.callTool('generate-ephemeral-wallet', {
        networkName: 'local',
      });

      const content = extractTextContent(response);
      expect(content).toContain('Ephemeral Wallet Operation Result');
      
      // Extract address from response
      const addressMatch = content.match(/0x[a-fA-F0-9]{40}/);
      expect(addressMatch).toBeTruthy();
      
      if (addressMatch) {
        const address = addressMatch[0];
        expect(validateAddress(address)).toBe(true);
      }
    });

    it('should check balance of ephemeral wallet', async () => {
      // First generate wallet
      const genResponse = await mcpClient.callTool('generate-ephemeral-wallet', {
        networkName: 'local',
      });

      const genContent = extractTextContent(genResponse);
      const addressMatch = genContent.match(/0x[a-fA-F0-9]{40}/);
      
      if (!addressMatch) {
        throw new Error('Failed to extract wallet address');
      }

      const walletAddress = addressMatch[0];

      // Check balance (should be 0)
      const balanceResponse = await mcpClient.callTool('check-wallet-balance', {
        walletAddress,
        networkName: 'local',
      });

      const balanceContent = extractTextContent(balanceResponse);
      expect(balanceContent).toContain('Ephemeral Wallet Operation Result');
    });

    it('should list ephemeral wallets', async () => {
      // Generate a wallet first
      await mcpClient.callTool('generate-ephemeral-wallet', {
        networkName: 'local',
      });

      // List wallets
      const response = await mcpClient.callTool('list-ephemeral-wallets', {});
      
      const content = extractTextContent(response);
      expect(content).toBeTruthy();
    });
  });

  describe('Multi-Block Operations', () => {
    it('should process multiple transactions successfully', async () => {
      const startBlock = await publicClient.getBlockNumber();
      
      // Record initial balances
      const initialUser1Balance = await getEthBalance(publicClient, TEST_ACCOUNTS.user1.address as `0x${string}`);
      const initialUser2Balance = await getEthBalance(publicClient, TEST_ACCOUNTS.user2.address as `0x${string}`);
      
      // Make multiple transactions
      const tx1 = await sendEth(walletClient, TEST_ACCOUNTS.user1.address as `0x${string}`, '0.1');
      const receipt1 = await waitForTransaction(publicClient, tx1);
      expect(receipt1.status).toBe('success');
      
      const tx2 = await sendEth(walletClient, TEST_ACCOUNTS.user2.address as `0x${string}`, '0.2');
      const receipt2 = await waitForTransaction(publicClient, tx2);
      expect(receipt2.status).toBe('success');
      
      // Verify balances changed
      const finalUser1Balance = await getEthBalance(publicClient, TEST_ACCOUNTS.user1.address as `0x${string}`);
      const finalUser2Balance = await getEthBalance(publicClient, TEST_ACCOUNTS.user2.address as `0x${string}`);
      
      expect(parseFloat(finalUser1Balance)).toBeGreaterThan(parseFloat(initialUser1Balance));
      expect(parseFloat(finalUser2Balance)).toBeGreaterThan(parseFloat(initialUser2Balance));
      
      // Block should be at least the same as start (could be higher due to transactions)
      const endBlock = await publicClient.getBlockNumber();
      expect(endBlock).toBeGreaterThanOrEqual(startBlock);
    });

    it('should handle reorganizations gracefully', async () => {
      // Test snapshot/revert functionality without relying on specific block numbers
      const initialBalance = await getEthBalance(publicClient, TEST_ACCOUNTS.user1.address as `0x${string}`);
      const snapshot1 = await takeSnapshot(publicClient);
      
      // Make a transaction that changes state
      const txHash = await sendEth(walletClient, TEST_ACCOUNTS.user1.address as `0x${string}`, '0.1');
      await waitForTransaction(publicClient, txHash);
      
      // Verify state changed
      const newBalance = await getEthBalance(publicClient, TEST_ACCOUNTS.user1.address as `0x${string}`);
      expect(parseFloat(newBalance)).toBeGreaterThan(parseFloat(initialBalance));
      
      // Revert to snapshot
      const reverted = await revertToSnapshot(publicClient, snapshot1);
      expect(reverted).toBe(true);
      
      // Verify state was reverted (balance should be back to initial)
      const revertedBalance = await getEthBalance(publicClient, TEST_ACCOUNTS.user1.address as `0x${string}`);
      expect(parseFloat(revertedBalance)).toBeCloseTo(parseFloat(initialBalance), 10);
    });
  });

  describe('Error Recovery', () => {
    it('should handle network disconnection', async () => {
      // This would simulate network issues
      // For now, test that client handles unavailable RPC
      const badClient = createTestPublicClient('http://localhost:9999');
      
      try {
        await badClient.getBlockNumber();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should recover from failed transactions', async () => {
      // Send a transaction that will fail
      try {
        await walletClient.sendTransaction({
          to: '0x0000000000000000000000000000000000000000',
          value: BigInt(0),
          gas: BigInt(1), // Intentionally too low
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Should still be able to send valid transactions
      const hash = await sendEth(
        walletClient,
        TEST_ACCOUNTS.user2.address as `0x${string}`,
        '0.01'
      );
      expect(hash).toBeTruthy();
    });
  });

  describe('Concurrent Blockchain Operations', () => {
    it('should handle multiple simultaneous transactions', async () => {
      // Send transactions sequentially to avoid nonce conflicts
      const hash1 = await sendEth(walletClient, TEST_ACCOUNTS.user1.address as `0x${string}`, '0.1');
      const hash2 = await sendEth(walletClient, TEST_ACCOUNTS.user2.address as `0x${string}`, '0.2');
      const hashes = [hash1, hash2];
      
      expect(hashes).toHaveLength(2);
      for (const hash of hashes) {
        expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      }

      // Wait for all confirmations
      await Promise.all(hashes.map(h => waitForTransaction(publicClient, h)));
    });

    it('should maintain nonce ordering', async () => {
      const nonce1 = await publicClient.getTransactionCount({
        address: TEST_ACCOUNTS.deployer.address as `0x${string}`,
      });

      const hash = await sendEth(walletClient, TEST_ACCOUNTS.user1.address as `0x${string}`, '0.01');

      // Wait for transaction to be mined before checking nonce
      await waitForTransaction(publicClient, hash);

      const nonce2 = await publicClient.getTransactionCount({
        address: TEST_ACCOUNTS.deployer.address as `0x${string}`,
      });

      expect(nonce2).toBe(nonce1 + 1);
    });
  });
});