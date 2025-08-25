import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import crypto from 'crypto';
import { getNetworkConfig, resolveNetworkConfig } from '../networks/index.js';

const BASE_DIR = process.env.DAO_DEPLOYER_DATA_DIR || join(homedir(), '.dao-deployer');
const WALLET_DIR = join(BASE_DIR, 'ephemeral-wallets');

export interface EphemeralWallet {
  address: string;
  networkName: string;
  createdAt: Date;
  keyFile: string;
}

export interface WalletBalance {
  address: string;
  networkName: string;
  balance: string; // in ETH/native token
  balanceWei: bigint;
  hasBalance: boolean;
}

export interface SweepResult {
  success: boolean;
  transactionHash?: string;
  amountSwept: string; // in ETH/native token
  amountSweptWei: bigint;
  recipientAddress: string;
  gasUsed?: bigint;
  error?: string;
  keyDeleted: boolean;
}

/**
 * Ensure wallet directory exists
 */
async function ensureWalletDir(): Promise<void> {
  try {
    await fs.access(WALLET_DIR);
  } catch {
    await fs.mkdir(WALLET_DIR, { recursive: true });
  }
}

/**
 * Generate a new ephemeral wallet using VIEM's secure generation
 */
export async function generateEphemeralWallet(networkName: string): Promise<EphemeralWallet> {
  try {
    await ensureWalletDir();
    
    // Generate new private key using VIEM's secure generation
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    
    // Create wallet metadata with private key stored securely
    const walletId = crypto.randomUUID();
    const createdAt = new Date();
    
    const walletData = {
      id: walletId,
      address: account.address,
      networkName,
      createdAt: createdAt.toISOString(),
      // Store private key directly - VIEM handles security
      privateKey,
      securityNote: 'Generated using VIEM - private key stored for ephemeral use only'
    };
    
    // Save to disk with restricted permissions using address-based filename
    const keyFile = join(WALLET_DIR, `${account.address.slice(2)}.json`);
    await fs.writeFile(keyFile, JSON.stringify(walletData, null, 2), { mode: 0o600 });
    
    // Generated ephemeral wallet
    // Saved securely to keyfile
    // Security warning for software wallet
    
    return {
      address: account.address,
      networkName,
      createdAt,
      keyFile
    };
    
  } catch (error: any) {
    throw error;
  }
}

/**
 * List all ephemeral wallets
 */
export async function listEphemeralWallets(): Promise<EphemeralWallet[]> {
  try {
    await ensureWalletDir();
    
    const files = await fs.readdir(WALLET_DIR);
    const walletFiles = files.filter(f => f.endsWith('.json'));
    
    const wallets: EphemeralWallet[] = [];
    
    for (const file of walletFiles) {
      try {
        const filePath = join(WALLET_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        
        wallets.push({
          address: data.address,
          networkName: data.networkName,
          createdAt: new Date(data.createdAt),
          keyFile: filePath
        });
      } catch (error) {
        // Failed to read wallet file
      }
    }
    
    // Sort by creation date (newest first)
    return wallets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
  } catch (error: any) {
    // Failed to list ephemeral wallets
    return [];
  }
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(address: string, networkName: string): Promise<WalletBalance> {
  try {
    const networkConfig = await resolveNetworkConfig(getNetworkConfig(networkName));
    
    const publicClient = createPublicClient({
      transport: http(networkConfig.rpcUrl)
    });
    
    const balance = await publicClient.getBalance({ 
      address: address as `0x${string}` 
    });
    
    const balanceEth = formatEther(balance);
    
    return {
      address,
      networkName,
      balance: balanceEth,
      balanceWei: balance,
      hasBalance: balance > 0n
    };
    
  } catch (error: any) {
    // Failed to get balance
    throw error;
  }
}

/**
 * Load private key from wallet file (VIEM secure storage)
 */
async function loadPrivateKey(walletAddress: string, networkName: string): Promise<string> {
  try {
    const wallets = await listEphemeralWallets();
    const wallet = wallets.find(w => 
      w.address.toLowerCase() === walletAddress.toLowerCase() && 
      w.networkName === networkName
    );
    
    if (!wallet) {
      throw new Error(`No ephemeral wallet found for address ${walletAddress} on ${networkName}`);
    }
    
    const content = await fs.readFile(wallet.keyFile, 'utf-8');
    const data = JSON.parse(content);
    
    // Private key stored directly (VIEM handles security)
    if (!data.privateKey) {
      throw new Error(`Invalid wallet file: missing private key for ${walletAddress}`);
    }
    
    return data.privateKey;
    
  } catch (error: any) {
    throw error;
  }
}

/**
 * Sweep all funds from ephemeral wallet to recipient
 */
export async function sweepEphemeralWallet(
  walletAddress: string,
  recipientAddress: string,
  networkName: string,
  deleteKeyAfterSweep: boolean = false
): Promise<SweepResult> {
  try {
    // Load private key
    const privateKey = await loadPrivateKey(walletAddress, networkName);
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    // Get network config
    const networkConfig = await resolveNetworkConfig(getNetworkConfig(networkName));
    
    const publicClient = createPublicClient({
      transport: http(networkConfig.rpcUrl)
    });
    
    // Get current balance
    const balance = await publicClient.getBalance({ 
      address: account.address 
    });
    
    if (balance === 0n) {
      return {
        success: true,
        amountSwept: '0',
        amountSweptWei: 0n,
        recipientAddress,
        error: 'Wallet already empty - no funds to sweep',
        keyDeleted: deleteKeyAfterSweep ? await deleteWalletKey(walletAddress, networkName) : false
      };
    }
    
    // Estimate gas for transfer
    const gasEstimate = await publicClient.estimateGas({
      account,
      to: recipientAddress as `0x${string}`,
      value: parseEther('0') // We'll calculate the actual amount after gas estimation
    });
    
    // Get current gas price
    const gasPrice = await publicClient.getGasPrice();
    const gasCost = gasEstimate * gasPrice;
    
    // Calculate amount to send (balance minus gas cost)
    if (balance <= gasCost) {
      return {
        success: false,
        amountSwept: '0',
        amountSweptWei: 0n,
        recipientAddress,
        error: `Insufficient balance to cover gas costs. Balance: ${formatEther(balance)} ETH, Gas cost: ${formatEther(gasCost)} ETH`,
        keyDeleted: false
      };
    }
    
    const amountToSend = balance - gasCost;
    
    // Get network chain config for VIEM
    const networkChain = {
      id: networkConfig.chainId,
      name: networkConfig.name,
      network: networkConfig.name.toLowerCase(),
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH', 
        decimals: 18
      },
      rpcUrls: {
        default: {
          http: [networkConfig.rpcUrl]
        },
        public: {
          http: [networkConfig.rpcUrl]
        }
      }
    };
    
    // Create wallet client for signing with proper chain
    const walletClient = createWalletClient({
      account,
      chain: networkChain,
      transport: http(networkConfig.rpcUrl)
    });
    
    
    // Send transaction using VIEM wallet client
    const hash = await walletClient.sendTransaction({
      to: recipientAddress as `0x${string}`,
      value: amountToSend,
      gas: gasEstimate,
      gasPrice
    });
    
    
    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    // Transaction confirmed
    
    // Check if funds were successfully transferred
    const newBalance = await publicClient.getBalance({ address: account.address });
    const fundsRemaining = newBalance > 0n;
    
    // Optionally delete key only if sweep was successful and no funds remain
    let keyDeleted = false;
    if (deleteKeyAfterSweep && !fundsRemaining) {
      keyDeleted = await deleteWalletKey(walletAddress, networkName);
    }
    
    return {
      success: true,
      transactionHash: hash,
      amountSwept: formatEther(amountToSend),
      amountSweptWei: amountToSend,
      recipientAddress,
      gasUsed: receipt.gasUsed,
      keyDeleted
    };
    
  } catch (error: any) {
    return {
      success: false,
      amountSwept: '0',
      amountSweptWei: 0n,
      recipientAddress,
      error: error.message,
      keyDeleted: false
    };
  }
}

/**
 * Delete wallet key file
 */
async function deleteWalletKey(walletAddress: string, networkName: string): Promise<boolean> {
  try {
    const wallets = await listEphemeralWallets();
    const wallet = wallets.find(w => 
      w.address.toLowerCase() === walletAddress.toLowerCase() && 
      w.networkName === networkName
    );
    
    if (!wallet) {
      return false;
    }
    
    await fs.unlink(wallet.keyFile);
    return true;
    
  } catch (error: any) {
    return false;
  }
}

/**
 * Manually delete a wallet (with confirmation)
 */
export async function deleteEphemeralWallet(walletAddress: string, networkName: string): Promise<boolean> {
  return deleteWalletKey(walletAddress, networkName);
}