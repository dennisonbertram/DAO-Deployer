import { z } from 'zod';
import { 
  generateEphemeralWallet, 
  listEphemeralWallets, 
  getWalletBalance, 
  sweepEphemeralWallet, 
  deleteEphemeralWallet,
  type EphemeralWallet,
  type WalletBalance,
  type SweepResult
} from '../utils/ephemeral-wallet.js';

// Input validation schemas
export const GenerateEphemeralWalletInputSchema = z.object({
  networkName: z.string().min(1, "Network name is required")
});

export const CheckWalletBalanceInputSchema = z.object({
  walletAddress: z.string().refine(
    (addr) => addr.startsWith('0x') && addr.length === 42,
    { message: "Invalid Ethereum address format" }
  ),
  networkName: z.string().min(1, "Network name is required")
});

export const SweepEphemeralWalletInputSchema = z.object({
  walletAddress: z.string().refine(
    (addr) => addr.startsWith('0x') && addr.length === 42,
    { message: "Invalid wallet address format" }
  ),
  recipientAddress: z.string().refine(
    (addr) => addr.startsWith('0x') && addr.length === 42,
    { message: "Invalid recipient address format" }
  ),
  networkName: z.string().min(1, "Network name is required"),
  deleteKeyAfterSweep: z.boolean().default(false)
});

export const DeleteEphemeralWalletInputSchema = z.object({
  walletAddress: z.string().refine(
    (addr) => addr.startsWith('0x') && addr.length === 42,
    { message: "Invalid wallet address format" }
  ),
  networkName: z.string().min(1, "Network name is required")
});

// Result interfaces
export interface EphemeralWalletOperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Generate a new ephemeral wallet for temporary funding
 */
export async function generateEphemeralWalletTool(
  input: z.infer<typeof GenerateEphemeralWalletInputSchema>
): Promise<EphemeralWalletOperationResult> {
  try {
    const config = GenerateEphemeralWalletInputSchema.parse(input);
    
    console.log(`🔐 Generating ephemeral wallet for ${config.networkName}...`);
    
    const wallet = await generateEphemeralWallet(config.networkName);
    
    console.log(`✅ Ephemeral wallet generated: ${wallet.address}`);
    
    return {
      success: true,
      message: `Ephemeral wallet generated successfully on ${config.networkName}`,
      data: {
        address: wallet.address,
        networkName: wallet.networkName,
        createdAt: wallet.createdAt.toISOString(),
        fundingInstructions: `Send funds to this address: ${wallet.address}`,
        securityNote: "This wallet uses software-generated keys stored encrypted on disk. For maximum security, use hardware wallets for large amounts."
      }
    };
    
  } catch (error: any) {
    console.error('❌ Failed to generate ephemeral wallet:', error.message);
    return {
      success: false,
      message: 'Failed to generate ephemeral wallet',
      error: error.message
    };
  }
}

/**
 * List all ephemeral wallets
 */
export async function listEphemeralWalletsTool(): Promise<EphemeralWalletOperationResult> {
  try {
    console.log('📋 Listing ephemeral wallets...');
    
    const wallets = await listEphemeralWallets();
    
    console.log(`✅ Found ${wallets.length} ephemeral wallets`);
    
    return {
      success: true,
      message: `Found ${wallets.length} ephemeral wallet(s)`,
      data: {
        wallets: wallets.map(w => ({
          address: w.address,
          networkName: w.networkName,
          createdAt: w.createdAt.toISOString(),
          ageInHours: Math.round((Date.now() - w.createdAt.getTime()) / (1000 * 60 * 60))
        })),
        total: wallets.length
      }
    };
    
  } catch (error: any) {
    console.error('❌ Failed to list ephemeral wallets:', error.message);
    return {
      success: false,
      message: 'Failed to list ephemeral wallets',
      error: error.message
    };
  }
}

/**
 * Check wallet balance
 */
export async function checkWalletBalanceTool(
  input: z.infer<typeof CheckWalletBalanceInputSchema>
): Promise<EphemeralWalletOperationResult> {
  try {
    const config = CheckWalletBalanceInputSchema.parse(input);
    
    console.log(`💰 Checking balance for ${config.walletAddress} on ${config.networkName}...`);
    
    const balance = await getWalletBalance(config.walletAddress, config.networkName);
    
    console.log(`✅ Balance: ${balance.balance} ETH (${balance.hasBalance ? 'funded' : 'empty'})`);
    
    return {
      success: true,
      message: `Wallet balance retrieved for ${config.networkName}`,
      data: {
        address: balance.address,
        networkName: balance.networkName,
        balance: balance.balance,
        balanceWei: balance.balanceWei.toString(),
        hasBalance: balance.hasBalance,
        status: balance.hasBalance ? '✅ Funded - ready for deployment' : '⚠️ Empty - needs funding'
      }
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to check balance for ${input.walletAddress}:`, error.message);
    return {
      success: false,
      message: 'Failed to check wallet balance',
      error: error.message
    };
  }
}

/**
 * Sweep all funds from ephemeral wallet to recipient
 */
export async function sweepEphemeralWalletTool(
  input: z.infer<typeof SweepEphemeralWalletInputSchema>
): Promise<EphemeralWalletOperationResult> {
  try {
    const config = SweepEphemeralWalletInputSchema.parse(input);
    
    console.log(`💸 Sweeping funds from ${config.walletAddress} to ${config.recipientAddress}...`);
    console.log(`🔐 Delete key after sweep: ${config.deleteKeyAfterSweep ? 'Yes' : 'No'}`);
    
    const result = await sweepEphemeralWallet(
      config.walletAddress,
      config.recipientAddress,
      config.networkName,
      config.deleteKeyAfterSweep
    );
    
    if (result.success) {
      console.log(`✅ Swept ${result.amountSwept} ETH to ${result.recipientAddress}`);
      if (result.keyDeleted) {
        console.log(`🗑️ Private key deleted successfully`);
      }
    } else {
      console.error(`❌ Sweep failed: ${result.error}`);
    }
    
    return {
      success: result.success,
      message: result.success 
        ? `Successfully swept ${result.amountSwept} ETH to recipient`
        : `Sweep failed: ${result.error}`,
      data: {
        transactionHash: result.transactionHash,
        amountSwept: result.amountSwept,
        recipientAddress: result.recipientAddress,
        gasUsed: result.gasUsed?.toString(),
        keyDeleted: result.keyDeleted,
        warnings: result.error && result.success ? [result.error] : undefined
      },
      error: result.success ? undefined : result.error
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to sweep wallet ${input.walletAddress}:`, error.message);
    return {
      success: false,
      message: 'Failed to sweep ephemeral wallet',
      error: error.message
    };
  }
}

/**
 * Delete ephemeral wallet (manual cleanup)
 */
export async function deleteEphemeralWalletTool(
  input: z.infer<typeof DeleteEphemeralWalletInputSchema>
): Promise<EphemeralWalletOperationResult> {
  try {
    const config = DeleteEphemeralWalletInputSchema.parse(input);
    
    console.log(`🗑️ Deleting ephemeral wallet ${config.walletAddress}...`);
    
    // Check balance first to warn user
    try {
      const balance = await getWalletBalance(config.walletAddress, config.networkName);
      if (balance.hasBalance) {
        return {
          success: false,
          message: 'Cannot delete wallet with remaining balance',
          error: `Wallet still contains ${balance.balance} ETH. Use sweep-ephemeral-wallet to recover funds first.`
        };
      }
    } catch (balanceError) {
      console.warn('⚠️ Could not check balance before deletion:', balanceError);
    }
    
    const deleted = await deleteEphemeralWallet(config.walletAddress, config.networkName);
    
    if (deleted) {
      console.log(`✅ Ephemeral wallet deleted: ${config.walletAddress}`);
    } else {
      console.warn(`⚠️ Wallet file not found: ${config.walletAddress}`);
    }
    
    return {
      success: true,
      message: deleted 
        ? `Ephemeral wallet deleted successfully`
        : `Wallet file not found (may have been already deleted)`,
      data: {
        address: config.walletAddress,
        networkName: config.networkName,
        deleted
      }
    };
    
  } catch (error: any) {
    console.error(`❌ Failed to delete wallet ${input.walletAddress}:`, error.message);
    return {
      success: false,
      message: 'Failed to delete ephemeral wallet',
      error: error.message
    };
  }
}

/**
 * Format ephemeral wallet operation results for display
 */
export function formatEphemeralWalletResult(result: EphemeralWalletOperationResult): string {
  const sections = ['# 🔐 Ephemeral Wallet Operation Result', ''];
  
  // Status
  sections.push(
    `**Status:** ${result.success ? '✅ Success' : '❌ Failed'}`,
    `**Message:** ${result.message}`,
    ''
  );
  
  // Error details
  if (!result.success && result.error) {
    sections.push(
      '## ❌ Error Details',
      `\`\`\``,
      result.error,
      `\`\`\``,
      ''
    );
  }
  
  // Success data
  if (result.success && result.data) {
    sections.push('## 📊 Details', '');
    
    const data = result.data;
    
    // Wallet generation
    if (data.address && data.fundingInstructions) {
      sections.push(
        '### 🆕 New Wallet Generated',
        `- **Address:** \`${data.address}\``,
        `- **Network:** ${data.networkName}`,
        `- **Created:** ${data.createdAt}`,
        '',
        '### 💰 Funding Instructions',
        `Send funds to: \`${data.address}\``,
        '',
        '### ⚠️ Security Note',
        data.securityNote,
        ''
      );
    }
    
    // Wallet list
    if (data.wallets) {
      sections.push(
        '### 📋 Ephemeral Wallets',
        `**Total:** ${data.total}`,
        ''
      );
      
      if (data.wallets.length > 0) {
        sections.push(
          '| Address | Network | Age | Created |',
          '|---------|---------|-----|---------|'
        );
        
        data.wallets.forEach((wallet: any) => {
          const shortAddr = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
          sections.push(`| ${shortAddr} | ${wallet.networkName} | ${wallet.ageInHours}h | ${wallet.createdAt.split('T')[0]} |`);
        });
        sections.push('');
      }
    }
    
    // Balance check
    if (data.balance !== undefined) {
      sections.push(
        '### 💰 Wallet Balance',
        `- **Address:** \`${data.address}\``,
        `- **Balance:** ${data.balance} ETH`,
        `- **Status:** ${data.status}`,
        ''
      );
    }
    
    // Sweep result
    if (data.transactionHash) {
      sections.push(
        '### 💸 Sweep Transaction',
        `- **Transaction Hash:** \`${data.transactionHash}\``,
        `- **Amount Swept:** ${data.amountSwept} ETH`,
        `- **Recipient:** \`${data.recipientAddress}\``,
        `- **Gas Used:** ${data.gasUsed ? data.gasUsed.toLocaleString() : 'N/A'}`,
        `- **Key Deleted:** ${data.keyDeleted ? '✅ Yes' : '❌ No'}`,
        ''
      );
      
      if (data.warnings && data.warnings.length > 0) {
        sections.push(
          '### ⚠️ Warnings',
          ...data.warnings.map((w: string) => `- ${w}`),
          ''
        );
      }
    }
    
    // Deletion result
    if (data.deleted !== undefined) {
      sections.push(
        '### 🗑️ Deletion Result',
        `- **Address:** \`${data.address}\``,
        `- **Network:** ${data.networkName}`,
        `- **File Deleted:** ${data.deleted ? '✅ Yes' : '❌ Not found'}`,
        ''
      );
    }
  }
  
  // Next steps
  if (result.success) {
    sections.push('## 📋 Next Steps');
    
    if (result.data?.address && result.data?.fundingInstructions) {
      sections.push(
        '1. **Fund the wallet** by sending ETH/tokens to the generated address',
        '2. **Use the wallet** for contract deployments',
        '3. **Sweep remaining funds** when done to recover any leftover balance',
        '4. **Delete the wallet** after sweeping to clean up'
      );
    } else if (result.data?.transactionHash) {
      sections.push(
        '1. **Verify transaction** on the block explorer',
        '2. **Confirm recipient received funds**',
        '3. **Clean up wallet files** if key was not auto-deleted'
      );
    } else {
      sections.push(
        '1. **Check wallet balances** before using for deployments',
        '2. **Sweep funds** when operations are complete',
        '3. **Delete unused wallets** to maintain security'
      );
    }
  } else {
    sections.push(
      '## 🛠️ Troubleshooting',
      '1. **Verify wallet address format** (must be 42-character hex with 0x prefix)',
      '2. **Check network name** matches supported networks',
      '3. **Ensure wallet has sufficient balance** for gas costs',
      '4. **Try again** - network issues can cause temporary failures'
    );
  }
  
  return sections.join('\n');
}