/**
 * End-to-end test setup
 * Configures full test environment with all services
 */
import { beforeAll, afterAll } from 'vitest';
import { startAnvil, stopAnvil, startMCPServer, stopMCPServer, ANVIL_ACCOUNTS, ANVIL_RPC_URL } from './integration-setup';
import { ChildProcess } from 'child_process';
import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from 'viem';
import { localhost } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

let anvilProcess: ChildProcess | null = null;
let mcpServerProcess: ChildProcess | null = null;
let publicClient: PublicClient | null = null;
let walletClients: WalletClient[] = [];

/**
 * Setup blockchain clients for E2E tests
 */
export async function setupBlockchainClients() {
  // Create public client for reading blockchain state
  publicClient = createPublicClient({
    chain: localhost,
    transport: http(ANVIL_RPC_URL),
  });

  // Create wallet clients for test accounts
  walletClients = ANVIL_ACCOUNTS.map(account =>
    createWalletClient({
      chain: localhost,
      transport: http(ANVIL_RPC_URL),
      account: privateKeyToAccount(account.privateKey as `0x${string}`),
    })
  );

  console.log('Blockchain clients configured for E2E tests');
}

/**
 * Fund a wallet address with ETH from test account
 */
export async function fundWallet(address: string, amountInEth: string): Promise<string> {
  const walletClient = walletClients[0]; // Use first test account
  if (!walletClient) {
    throw new Error('No wallet client available');
  }

  const hash = await walletClient.sendTransaction({
    to: address as `0x${string}`,
    value: BigInt(parseFloat(amountInEth) * 1e18),
  });

  // Wait for transaction confirmation
  if (publicClient) {
    await publicClient.waitForTransactionReceipt({ hash });
  }

  return hash;
}

/**
 * Get balance of an address
 */
export async function getBalance(address: string): Promise<bigint> {
  if (!publicClient) {
    throw new Error('Public client not initialized');
  }

  return publicClient.getBalance({
    address: address as `0x${string}`,
  });
}

/**
 * Deploy a test contract
 */
export async function deployTestContract(bytecode: string, args: any[] = []): Promise<string> {
  const walletClient = walletClients[0];
  if (!walletClient || !publicClient) {
    throw new Error('Clients not initialized');
  }

  const hash = await walletClient.deployContract({
    abi: [], // ABI will be provided by specific tests
    bytecode: bytecode as `0x${string}`,
    args,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.contractAddress || '';
}

// E2E test hooks
beforeAll(async () => {
  console.log('Setting up E2E test environment...');
  
  // Start all services
  anvilProcess = await startAnvil();
  mcpServerProcess = await startMCPServer();
  
  // Setup blockchain clients
  await setupBlockchainClients();
  
  console.log('E2E test environment ready');
});

afterAll(async () => {
  console.log('Tearing down E2E test environment...');
  
  // Stop all services
  if (anvilProcess) {
    await stopAnvil(anvilProcess);
  }
  
  if (mcpServerProcess) {
    await stopMCPServer(mcpServerProcess);
  }
  
  console.log('E2E test environment cleaned up');
});

// Export utilities for E2E tests
export function getPublicClient(): PublicClient | null {
  return publicClient;
}

export function getWalletClients(): WalletClient[] {
  return walletClients;
}

export function getTestAccounts() {
  return ANVIL_ACCOUNTS;
}