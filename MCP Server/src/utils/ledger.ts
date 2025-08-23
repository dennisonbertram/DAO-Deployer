import { default as Eth } from '@ledgerhq/hw-app-eth';
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid-singleton';
import { createWalletClient, http, custom, Address, Hex } from 'viem';
import { NetworkConfig } from '../types/index.js';
import { HardwareWalletError } from '../types/index.js';

/**
 * Ledger hardware wallet integration for secure transaction signing
 */

export interface LedgerConfig {
  derivationPath?: string;
  transport?: any;
}

export interface LedgerSigner {
  address: Address;
  signTransaction: (transaction: any) => Promise<Hex>;
  signMessage: (message: string) => Promise<Hex>;
  disconnect: () => Promise<void>;
}

/**
 * Create a connection to Ledger hardware wallet
 */
export async function connectToLedger(config: LedgerConfig = {}): Promise<LedgerSigner> {
  try {
    console.log('🔌 Connecting to Ledger device...');
    
    // Default derivation path for Ethereum (m/44'/60'/0'/0/0)
    const derivationPath = config.derivationPath || "44'/60'/0'/0/0";
    
    // Create HID transport
    const transport = config.transport || await TransportNodeHid.create();
    
    // Create Ethereum app instance
    const eth = new Eth(transport);
    
    console.log('🔍 Getting Ethereum address from Ledger...');
    
    // Get the Ethereum address from Ledger
    const { address } = await eth.getAddress(derivationPath, false, true);
    
    console.log(`✅ Connected to Ledger: ${address}`);
    
    return {
      address: address as Address,
      
      signTransaction: async (transaction: any): Promise<Hex> => {
        try {
          console.log('🖊️  Signing transaction with Ledger...');
          console.log('📱 Please confirm transaction on your Ledger device');
          
          // Sign the transaction using Ledger
          const signature: any = await eth.signTransaction(derivationPath, transaction);
          
          // Combine r, s, v into a single signature
          const v = typeof signature.v === 'number' ? signature.v : parseInt(signature.v.toString(), 10);
          const fullSignature = `0x${signature.r}${signature.s}${v.toString(16).padStart(2, '0')}` as Hex;
          
          console.log('✅ Transaction signed successfully');
          return fullSignature;
          
        } catch (error: any) {
          if (error.message?.includes('denied')) {
            throw new HardwareWalletError('Transaction rejected by user on Ledger device');
          }
          throw new HardwareWalletError(`Failed to sign transaction: ${error.message}`);
        }
      },
      
      signMessage: async (message: string): Promise<Hex> => {
        try {
          console.log('🖊️  Signing message with Ledger...');
          console.log('📱 Please confirm message signing on your Ledger device');
          
          const signature: any = await eth.signPersonalMessage(derivationPath, Buffer.from(message).toString('hex'));
          const v = typeof signature.v === 'number' ? signature.v : parseInt(signature.v.toString(), 10);
          const fullSignature = `0x${signature.r}${signature.s}${v.toString(16).padStart(2, '0')}` as Hex;
          
          console.log('✅ Message signed successfully');
          return fullSignature;
          
        } catch (error: any) {
          if (error.message?.includes('denied')) {
            throw new HardwareWalletError('Message signing rejected by user on Ledger device');
          }
          throw new HardwareWalletError(`Failed to sign message: ${error.message}`);
        }
      },
      
      disconnect: async (): Promise<void> => {
        try {
          await transport.close();
          console.log('🔌 Ledger disconnected');
        } catch (error) {
          console.warn('Warning: Error disconnecting Ledger:', error);
        }
      }
    };
    
  } catch (error: any) {
    if (error.message?.includes('cannot open device')) {
      throw new HardwareWalletError(
        'Cannot connect to Ledger device. Please ensure:\n' +
        '1. Device is connected via USB\n' +
        '2. Device is unlocked\n' +
        '3. Ethereum app is open\n' +
        '4. No other applications are using the device'
      );
    }
    
    if (error.message?.includes('app not found')) {
      throw new HardwareWalletError(
        'Ethereum app not found on Ledger device. Please install the Ethereum app from Ledger Live.'
      );
    }
    
    throw new HardwareWalletError(`Failed to connect to Ledger: ${error.message}`);
  }
}

/**
 * Create a VIEM wallet client using Ledger for signing
 */
export async function createLedgerWalletClient(
  networkConfig: NetworkConfig,
  ledgerConfig: LedgerConfig = {}
): Promise<{ walletClient: any; ledgerSigner: LedgerSigner }> {
  
  const ledgerSigner = await connectToLedger(ledgerConfig);
  
  // Create custom transport that uses Ledger for signing
  const ledgerTransport = custom({
    async request({ method, params }) {
      console.log(`🌐 RPC Request: ${method}`);
      
      // Handle signing requests with Ledger
      if (method === 'eth_signTransaction') {
        const [transaction] = params as [any];
        return await ledgerSigner.signTransaction(transaction);
      }
      
      if (method === 'personal_sign') {
        const [message] = params as [string];
        return await ledgerSigner.signMessage(message);
      }
      
      if (method === 'eth_accounts') {
        return [ledgerSigner.address];
      }
      
      // For other requests, proxy to the network RPC
      const response = await fetch(networkConfig.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params,
        }),
      });
      
      const result: any = await response.json();
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result.result;
    },
  });
  
  // Create wallet client with Ledger transport
  const walletClient = createWalletClient({
    account: ledgerSigner.address,
    transport: ledgerTransport
  });
  
  console.log(`🏦 Created wallet client for ${networkConfig.name} with Ledger signer`);
  
  return { walletClient, ledgerSigner };
}

/**
 * Deploy a contract using Ledger hardware wallet
 */
export async function deployContractWithLedger(params: {
  networkConfig: NetworkConfig;
  contractBytecode: Hex;
  constructorArgs?: any[];
  gasEstimateMultiplier?: number;
  ledgerConfig?: LedgerConfig;
}): Promise<{
  contractAddress: Address;
  transactionHash: Hex;
  deployerAddress: Address;
}> {
  
  const { networkConfig, contractBytecode, constructorArgs = [], gasEstimateMultiplier = 1.2, ledgerConfig = {} } = params;
  
  console.log(`\n🚀 Deploying contract with Ledger on ${networkConfig.name}...`);
  
  const { walletClient, ledgerSigner } = await createLedgerWalletClient(networkConfig, ledgerConfig);
  
  try {
    // Estimate gas for deployment
    console.log('⛽ Estimating gas...');
    const gasEstimate = await walletClient.estimateGas({
      account: ledgerSigner.address,
      data: contractBytecode,
      value: 0n,
    });
    
    const adjustedGas = BigInt(Math.ceil(Number(gasEstimate) * gasEstimateMultiplier));
    console.log(`⛽ Gas estimate: ${gasEstimate.toLocaleString()} (adjusted: ${adjustedGas.toLocaleString()})`);
    
    // Get current gas price
    const gasPrice = await walletClient.getGasPrice();
    console.log(`💰 Gas price: ${(Number(gasPrice) / 1e9).toFixed(2)} gwei`);
    
    console.log('📱 Please confirm deployment transaction on your Ledger device...');
    
    // Deploy the contract
    const hash = await walletClient.deployContract({
      abi: [], // ABI not needed for deployment
      bytecode: contractBytecode,
      args: constructorArgs,
      gas: adjustedGas,
      gasPrice: gasPrice,
    });
    
    console.log(`📝 Transaction sent: ${hash}`);
    console.log('⏳ Waiting for transaction confirmation...');
    
    // Wait for transaction receipt
    const receipt = await walletClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'reverted') {
      throw new Error('Contract deployment transaction reverted');
    }
    
    const contractAddress = receipt.contractAddress;
    if (!contractAddress) {
      throw new Error('No contract address in receipt');
    }
    
    console.log(`✅ Contract deployed successfully!`);
    console.log(`📍 Contract address: ${contractAddress}`);
    console.log(`🔗 Transaction: ${hash}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed.toLocaleString()}`);
    
    return {
      contractAddress: contractAddress as Address,
      transactionHash: hash,
      deployerAddress: ledgerSigner.address,
    };
    
  } finally {
    // Always disconnect from Ledger
    await ledgerSigner.disconnect();
  }
}

/**
 * Get available Ledger devices
 */
export async function listLedgerDevices(): Promise<string[]> {
  try {
    const devices = await TransportNodeHid.list();
    return devices.map((device: any) => device.path || 'Unknown device');
  } catch (error) {
    console.warn('Could not list Ledger devices:', error);
    return [];
  }
}

/**
 * Check if Ledger device is connected and ready
 */
export async function checkLedgerStatus(): Promise<{
  connected: boolean;
  ethereumAppOpen: boolean;
  address?: Address;
  error?: string;
}> {
  try {
    const transport = await TransportNodeHid.create();
    const eth = new Eth(transport);
    
    try {
      const { address } = await eth.getAddress("44'/60'/0'/0/0", false, true);
      await transport.close();
      
      return {
        connected: true,
        ethereumAppOpen: true,
        address: address as Address,
      };
    } catch (error: any) {
      await transport.close();
      
      if (error.message?.includes('app not found')) {
        return {
          connected: true,
          ethereumAppOpen: false,
          error: 'Ethereum app not open on Ledger device',
        };
      }
      
      throw error;
    }
  } catch (error: any) {
    return {
      connected: false,
      ethereumAppOpen: false,
      error: error.message || 'Unknown error connecting to Ledger',
    };
  }
}