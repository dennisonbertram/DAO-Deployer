import { z } from 'zod';
import { createPublicClient, http, Address } from 'viem';
import { getNetworkConfig, resolveNetworkConfig } from '../networks/index.js';
import { loadContractABI, ContractName, loadAllContractABIs } from '../utils/contracts.js';

// Input validation schema for the get-deployment-info tool
export const GetDeploymentInfoInputSchema = z.object({
  contractAddress: z.string().refine(
    (addr) => addr.startsWith('0x') && addr.length === 42,
    { message: "Invalid Ethereum address format" }
  ),
  networkName: z.string(),
  includeABI: z.boolean().default(false),
  includeTransactionDetails: z.boolean().default(true),
  checkVerification: z.boolean().default(true)
});

export interface ContractDeploymentInfo {
  contractAddress: string;
  networkName: string;
  networkDetails: {
    chainId: number;
    name: string;
    explorerUrl?: string;
  };
  contractDetails: {
    bytecode: string;
    isContract: boolean;
    codeSize: number;
    isVerified?: boolean;
    verificationUrl?: string;
  };
  deploymentTransaction?: {
    hash: string;
    blockNumber: bigint;
    timestamp: Date;
    deployer: string;
    gasUsed: bigint;
    gasPrice: bigint;
    value: bigint;
  };
  abi?: any[];
  error?: string;
}

/**
 * Get deployment information for a contract
 */
export async function getDeploymentInfo(input: z.infer<typeof GetDeploymentInfoInputSchema>): Promise<ContractDeploymentInfo> {
  try {
    const config = GetDeploymentInfoInputSchema.parse(input);
    
    // Get network configuration
    const networkConfig = await resolveNetworkConfig(getNetworkConfig(config.networkName));
    
    
    // Create public client for the network
    const publicClient = createPublicClient({
      transport: http(networkConfig.rpcUrl)
    });
    
    const contractAddress = config.contractAddress as Address;
    
    // Get basic contract information
    const [bytecode, blockNumber] = await Promise.all([
      publicClient.getBytecode({ address: contractAddress }),
      publicClient.getBlockNumber()
    ]);
    
    const isContract = !!(bytecode && bytecode !== '0x');
    const codeSize = bytecode ? (bytecode.length - 2) / 2 : 0; // Convert hex length to bytes
    
    const result: ContractDeploymentInfo = {
      contractAddress: config.contractAddress,
      networkName: config.networkName,
      networkDetails: {
        chainId: networkConfig.chainId,
        name: networkConfig.name,
        explorerUrl: networkConfig.explorerUrl
      },
      contractDetails: {
        bytecode: bytecode || '0x',
        isContract,
        codeSize,
        verificationUrl: networkConfig.explorerUrl 
          ? `${networkConfig.explorerUrl}/address/${config.contractAddress}#code`
          : undefined
      }
    };
    
    if (!isContract) {
      result.error = 'Address does not contain a contract (no bytecode found)';
      return result;
    }
    
    // Try to get deployment transaction details
    if (config.includeTransactionDetails) {
      try {
        const deploymentTx = await findDeploymentTransaction(publicClient, contractAddress);
        if (deploymentTx) {
          result.deploymentTransaction = deploymentTx;
        }
      } catch (error) {
      }
    }
    
    // Include ABI if requested
    if (config.includeABI) {
      try {
        result.abi = await tryGetContractABI(config.contractAddress, config.networkName);
      } catch (error) {
      }
    }
    
    if (result.deploymentTransaction) {
    }
    
    return result;
    
  } catch (error: any) {
    throw error;
  }
}

/**
 * Find the deployment transaction for a contract
 */
async function findDeploymentTransaction(
  publicClient: any,
  contractAddress: Address
): Promise<ContractDeploymentInfo['deploymentTransaction']> {
  
  try {
    // Import viem functions for transaction searching
    const { formatEther } = await import('viem');
    
    const currentBlock = await publicClient.getBlockNumber();
    const searchDepth = 1000n; // Search last 1000 blocks (adjust as needed)
    const startBlock = currentBlock > searchDepth ? currentBlock - searchDepth : 0n;
    
    // Search through recent blocks for contract creation
    for (let blockNumber = currentBlock; blockNumber > startBlock; blockNumber--) {
      try {
        const block = await publicClient.getBlock({ 
          blockNumber, 
          includeTransactions: true 
        });
        
        if (!block.transactions) continue;
        
        // Check each transaction in the block
        for (const tx of block.transactions) {
          if (typeof tx === 'string') continue; // Skip if only hash returned
          
          // Check if it's a contract creation (to is null)
          if (tx.to === null) {
            try {
              // Get the receipt to see if it created our contract
              const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash });
              
              if (receipt.contractAddress?.toLowerCase() === contractAddress.toLowerCase()) {
                // Found the deployment transaction!
                return {
                  hash: tx.hash,
                  blockNumber: receipt.blockNumber,
                  timestamp: new Date(Number(block.timestamp) * 1000),
                  deployer: tx.from,
                  gasUsed: receipt.gasUsed,
                  gasPrice: tx.gasPrice || 0n,
                  value: tx.value
                };
              }
            } catch (receiptError) {
              // Continue searching if receipt fetch fails
              continue;
            }
          }
        }
      } catch (blockError) {
        // Continue searching if block fetch fails
        continue;
      }
    }
    
    // If not found in recent blocks, contract might be older
    return undefined;
    
  } catch (error) {
    return undefined;
  }
}

/**
 * Try to get contract ABI from various sources
 */
async function tryGetContractABI(contractAddress: string, networkName: string): Promise<any[] | undefined> {
  try {
    // First, try to match against our known contracts
    const knownContracts: Record<string, ContractName> = {
      // This would be populated with known deployed contract addresses
      // For now, we'll try to infer from bytecode patterns
    };
    
    // If it's a known contract address, load its ABI
    const contractName = knownContracts[contractAddress.toLowerCase()];
    if (contractName) {
      try {
        const contractABI = await loadContractABI(contractName);
        return contractABI.abi;
      } catch (error) {
        // Fall through to other methods
      }
    }
    
    // Get network configuration for potential API-based lookups
    const networkConfig = getNetworkConfig(networkName);
    
    // Try to fetch ABI from block explorer API if available
    if (networkConfig.explorerApiUrl && networkConfig.explorerApiKey) {
      try {
        const resolvedConfig = await resolveNetworkConfig(networkConfig);
        const apiKey = resolvedConfig.explorerApiKey;
        const apiUrl = resolvedConfig.explorerApiUrl;
        
        if (apiKey && apiUrl && !apiKey.includes('${')) {
          const response = await fetch(
            `${apiUrl}?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`
          );
          
          if (response.ok) {
            const data = await response.json() as any;
            if (data.status === '1' && data.result) {
              try {
                const abi = JSON.parse(data.result);
                return Array.isArray(abi) ? abi : undefined;
              } catch (parseError) {
                // Invalid JSON response
              }
            }
          }
        }
      } catch (apiError) {
        // API call failed, continue with other methods
      }
    }
    
    // Try to match bytecode against known patterns
    try {
      const { createPublicClient, http } = await import('viem');
      const resolvedConfig = await resolveNetworkConfig(networkConfig);
      
      const publicClient = createPublicClient({
        transport: http(resolvedConfig.rpcUrl)
      });
      
      const bytecode = await publicClient.getBytecode({ 
        address: contractAddress as `0x${string}` 
      });
      
      if (bytecode) {
        // Check against known contract bytecode patterns
        // This is a basic approach - could be enhanced with more sophisticated matching
        const allContracts = await loadAllContractABIs();
        
        for (const [name, contractData] of Object.entries(allContracts)) {
          if (contractData.bytecode && bytecode.startsWith(contractData.bytecode.slice(0, 100))) {
            // Potential match based on bytecode prefix
            return contractData.abi;
          }
        }
      }
    } catch (bytecodeError) {
      // Bytecode analysis failed
    }
    
    // No ABI found through available methods
    return undefined;
    
  } catch (error) {
    return undefined;
  }
}

/**
 * Get deployment info for multiple contracts
 */
export async function getBatchDeploymentInfo(
  contracts: Array<{ address: string; name?: string }>,
  networkName: string
): Promise<ContractDeploymentInfo[]> {
  
  
  const results: ContractDeploymentInfo[] = [];
  
  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];
    
    
    try {
      const info = await getDeploymentInfo({
        contractAddress: contract.address,
        networkName: networkName,
        includeABI: false,
        includeTransactionDetails: true,
        checkVerification: true
      });
      
      results.push(info);
      
    } catch (error: any) {
      
      results.push({
        contractAddress: contract.address,
        networkName: networkName,
        networkDetails: {
          chainId: 0,
          name: networkName
        },
        contractDetails: {
          bytecode: '0x',
          isContract: false,
          codeSize: 0
        },
        error: error.message
      });
    }
  }
  
  const validContracts = results.filter(r => !r.error).length;
  
  return results;
}

/**
 * Format deployment info for display
 */
export function formatDeploymentInfo(info: ContractDeploymentInfo): string {
  const sections = [
    '# 📋 Contract Deployment Information',
    '',
    `**Contract Address:** \`${info.contractAddress}\``,
    `**Network:** ${info.networkDetails.name} (Chain ID: ${info.networkDetails.chainId})`,
    ''
  ];
  
  if (info.error) {
    sections.push(
      `**Status:** ❌ Error`,
      `**Error:** ${info.error}`,
      ''
    );
    return sections.join('\n');
  }
  
  sections.push(
    '## 📦 Contract Details',
    `- **Is Contract:** ${info.contractDetails.isContract ? '✅ Yes' : '❌ No'}`,
    `- **Code Size:** ${info.contractDetails.codeSize.toLocaleString()} bytes`,
    `- **Bytecode Hash:** \`${info.contractDetails.bytecode.slice(0, 10)}...\``,
    ''
  );
  
  if (info.contractDetails.verificationUrl) {
    sections.push(
      '## 🔍 Explorer Links',
      `- **Contract Page:** ${info.networkDetails.explorerUrl}/address/${info.contractAddress}`,
      `- **Verified Code:** ${info.contractDetails.verificationUrl}`,
      ''
    );
  }
  
  if (info.deploymentTransaction) {
    const tx = info.deploymentTransaction;
    const ethValue = Number(tx.value) / 1e18; // Convert wei to ETH
    
    sections.push(
      '## 🚀 Deployment Transaction',
      `- **Transaction Hash:** \`${tx.hash}\``,
      `- **Block Number:** ${tx.blockNumber.toString()}`,
      `- **Deployer:** \`${tx.deployer}\``,
      `- **Gas Used:** ${tx.gasUsed.toLocaleString()}`,
      `- **Gas Price:** ${(Number(tx.gasPrice) / 1e9).toFixed(2)} gwei`,
      `- **Value Sent:** ${ethValue.toFixed(6)} ETH`,
      `- **Timestamp:** ${tx.timestamp.toISOString()}`,
      ''
    );
  }
  
  if (info.abi) {
    const functions = info.abi.filter(item => item.type === 'function');
    const events = info.abi.filter(item => item.type === 'event');
    
    sections.push(
      '## 📋 Contract Interface',
      `- **Functions:** ${functions.length}`,
      `- **Events:** ${events.length}`,
      ''
    );
    
    if (functions.length > 0) {
      sections.push(
        '### 🔧 Key Functions',
        ...functions.slice(0, 5).map(fn => `- \`${fn.name}()\``),
        functions.length > 5 ? `- *... and ${functions.length - 5} more*` : '',
        ''
      );
    }
  }
  
  sections.push(
    '## 📊 Summary',
    info.contractDetails.isContract 
      ? '✅ Valid contract found with bytecode'
      : '❌ No contract bytecode at this address',
    info.deploymentTransaction 
      ? '✅ Deployment transaction details available'
      : '⚠️  Deployment transaction not found (may be older than search depth)',
    info.abi 
      ? '✅ Contract ABI loaded'
      : '⚠️  Contract ABI not available'
  );
  
  return sections.join('\n');
}

/**
 * Format batch deployment info for display
 */
export function formatBatchDeploymentInfo(infos: ContractDeploymentInfo[]): string {
  const validContracts = infos.filter(info => info.contractDetails.isContract).length;
  const totalSize = infos.reduce((sum, info) => sum + info.contractDetails.codeSize, 0);
  
  const sections = [
    `# 📋 Batch Deployment Information (${validContracts}/${infos.length} contracts)`,
    '',
    '| Address | Size | Deployed | Explorer |',
    '|---------|------|----------|----------|'
  ];
  
  infos.forEach(info => {
    const shortAddress = `${info.contractAddress.slice(0, 6)}...${info.contractAddress.slice(-4)}`;
    const size = `${(info.contractDetails.codeSize / 1024).toFixed(1)}KB`;
    const status = info.contractDetails.isContract ? '✅' : '❌';
    const explorerLink = info.networkDetails.explorerUrl 
      ? `[View](${info.networkDetails.explorerUrl}/address/${info.contractAddress})`
      : 'N/A';
    
    sections.push(`| ${shortAddress} | ${size} | ${status} | ${explorerLink} |`);
  });
  
  sections.push(
    '',
    '## 📊 Summary',
    `- **Total Contracts:** ${infos.length}`,
    `- **Valid Contracts:** ${validContracts}`,
    `- **Total Code Size:** ${(totalSize / 1024).toFixed(1)} KB`,
    `- **Network:** ${infos[0]?.networkDetails.name || 'Unknown'}`,
    ''
  );
  
  return sections.join('\n');
}