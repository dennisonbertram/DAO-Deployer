/**
 * Blockchain test utilities
 * Provides helpers for interacting with test blockchain
 */
import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  type PublicClient, 
  type WalletClient,
  type Address,
  type Hash,
  parseEther,
  formatEther,
  isAddress,
  getAddress,
} from 'viem';
import { localhost } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Test chain configuration
export const TEST_CHAIN = {
  ...localhost,
  id: 31337,
  name: 'Anvil Test',
  rpcUrls: {
    default: { http: ['http://localhost:8545'] },
    public: { http: ['http://localhost:8545'] },
  },
};

/**
 * Create a public client for reading blockchain state
 */
export function createTestPublicClient(rpcUrl = 'http://localhost:8545'): PublicClient {
  return createPublicClient({
    chain: TEST_CHAIN,
    transport: http(rpcUrl),
  });
}

/**
 * Create a wallet client for sending transactions
 */
export function createTestWalletClient(
  privateKey: `0x${string}`,
  rpcUrl = 'http://localhost:8545'
): WalletClient {
  return createWalletClient({
    chain: TEST_CHAIN,
    transport: http(rpcUrl),
    account: privateKeyToAccount(privateKey),
  });
}

/**
 * Wait for a transaction to be mined
 */
export async function waitForTransaction(
  client: PublicClient,
  hash: Hash,
  confirmations = 1
) {
  const receipt = await client.waitForTransactionReceipt({
    hash,
    confirmations,
  });
  return receipt;
}

/**
 * Send ETH from one address to another
 */
export async function sendEth(
  walletClient: WalletClient,
  to: Address,
  amountInEth: string
): Promise<Hash> {
  const hash = await walletClient.sendTransaction({
    to,
    value: parseEther(amountInEth),
  });
  return hash;
}

/**
 * Get ETH balance of an address
 */
export async function getEthBalance(
  client: PublicClient,
  address: Address
): Promise<string> {
  const balance = await client.getBalance({ address });
  return formatEther(balance);
}

/**
 * Deploy a contract and return its address
 */
export async function deployContract(
  walletClient: WalletClient,
  publicClient: PublicClient,
  bytecode: `0x${string}`,
  abi: any[] = [],
  args: any[] = []
): Promise<Address> {
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args,
  });

  const receipt = await waitForTransaction(publicClient, hash);
  
  if (!receipt.contractAddress) {
    throw new Error('Contract deployment failed - no address in receipt');
  }

  return receipt.contractAddress;
}

/**
 * Get contract bytecode at address
 */
export async function getContractCode(
  client: PublicClient,
  address: Address
): Promise<string | undefined> {
  const code = await client.getBytecode({ address });
  return code;
}

/**
 * Check if address is a contract
 */
export async function isContract(
  client: PublicClient,
  address: Address
): Promise<boolean> {
  const code = await getContractCode(client, address);
  return code !== undefined && code !== '0x';
}

/**
 * Mine blocks to advance blockchain time
 */
export async function mineBlocks(
  client: PublicClient,
  blocks: number
): Promise<void> {
  // Try Anvil's specific mining method first, then fallback to evm_mine
  try {
    await client.request({
      method: 'anvil_mine' as any,
      params: [blocks, 0], // mine specified number of blocks with 0 interval
    });
  } catch (error) {
    // Fallback to individual evm_mine calls
    console.log('anvil_mine failed, falling back to evm_mine');
    for (let i = 0; i < blocks; i++) {
      await client.request({
        method: 'evm_mine' as any,
        params: [],
      });
    }
  }
}

/**
 * Set next block timestamp
 */
export async function setNextBlockTimestamp(
  client: PublicClient,
  timestamp: number
): Promise<void> {
  await client.request({
    method: 'evm_setNextBlockTimestamp' as any,
    params: [timestamp],
  });
}

/**
 * Increase blockchain time
 */
export async function increaseTime(
  client: PublicClient,
  seconds: number
): Promise<void> {
  await client.request({
    method: 'evm_increaseTime' as any,
    params: [seconds],
  });
  await mineBlocks(client, 1);
}

/**
 * Take a snapshot of blockchain state
 */
export async function takeSnapshot(client: PublicClient): Promise<string> {
  const id = await client.request({
    method: 'evm_snapshot' as any,
    params: [],
  });
  return id as string;
}

/**
 * Revert to a blockchain snapshot
 */
export async function revertToSnapshot(
  client: PublicClient,
  snapshotId: string
): Promise<boolean> {
  const result = await client.request({
    method: 'evm_revert' as any,
    params: [snapshotId],
  });
  return result as boolean;
}

/**
 * Validate Ethereum address format
 */
export function validateAddress(address: string): boolean {
  return isAddress(address);
}

/**
 * Normalize address to checksummed format
 */
export function normalizeAddress(address: string): Address {
  return getAddress(address);
}

/**
 * Generate a random address for testing
 */
export function generateRandomAddress(): Address {
  const chars = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * 16)];
  }
  return normalizeAddress(address);
}

/**
 * Parse transaction receipt for events
 */
export function parseEvents(receipt: any, abi: any[]): any[] {
  // This would need the actual ABI parsing logic
  // For now, return raw logs
  return receipt.logs || [];
}

/**
 * Estimate gas for a transaction
 */
export async function estimateGas(
  client: PublicClient,
  transaction: any
): Promise<bigint> {
  const gas = await client.estimateGas(transaction);
  return gas;
}

/**
 * Get current gas price
 */
export async function getGasPrice(client: PublicClient): Promise<bigint> {
  const gasPrice = await client.getGasPrice();
  return gasPrice;
}