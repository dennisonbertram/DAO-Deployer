// Development-only API endpoint for funding wallets with test ETH from Anvil
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, parseEther, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { localhost } from '@/lib/contracts/addresses';

// Anvil default account private key (for development only)
// This is the first default account that Anvil creates
const ANVIL_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const publicClient = createPublicClient({
  chain: localhost,
  transport: http(),
});

const walletClient = createWalletClient({
  chain: localhost,
  transport: http(),
  account: privateKeyToAccount(ANVIL_PRIVATE_KEY as `0x${string}`),
});

export async function POST(request: NextRequest) {
  // Only allow this endpoint in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }
  
  try {
    // Parse the request body
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Validate the wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    // Check if we're connected to the correct network
    const chainId = await publicClient.getChainId();
    if (chainId !== localhost.id) {
      return NextResponse.json({ 
        error: `Expected chain ID ${localhost.id} but got ${chainId}. Make sure Anvil is running.` 
      }, { status: 500 });
    }

    // Get the current balance of the funding account
    const fundingAccount = walletClient.account.address;
    const fundingBalance = await publicClient.getBalance({ address: fundingAccount });
    
    const amountToSend = parseEther('100');
    
    if (fundingBalance < amountToSend) {
      return NextResponse.json({ 
        error: `Insufficient funds in Anvil account. Balance: ${fundingBalance.toString()} wei, Required: ${amountToSend.toString()} wei` 
      }, { status: 500 });
    }

    // Send the transaction
    const hash = await walletClient.sendTransaction({
      to: walletAddress as Address,
      value: amountToSend,
    });

    // Wait for the transaction to be mined
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Get the new balance of the recipient
    const newBalance = await publicClient.getBalance({ address: walletAddress as Address });

    return NextResponse.json({
      success: true,
      transactionHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      amountSent: '100',
      newBalance: newBalance.toString(),
      message: `Successfully sent 100 ETH to ${walletAddress}`,
    });

  } catch (error) {
    console.error('Error funding wallet:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to fund wallet';
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to Anvil. Make sure Anvil is running on localhost:8545';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds in Anvil account';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// For development info
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  try {
    const chainId = await publicClient.getChainId();
    const fundingAccount = privateKeyToAccount(ANVIL_PRIVATE_KEY as `0x${string}`).address;
    const balance = await publicClient.getBalance({ address: fundingAccount });

    return NextResponse.json({
      chainId,
      fundingAccount,
      balance: balance.toString(),
      balanceETH: (Number(balance) / 1e18).toFixed(4),
      status: 'ready',
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Cannot connect to Anvil',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}