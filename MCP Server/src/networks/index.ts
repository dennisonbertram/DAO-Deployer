import { NetworkConfig } from '../types/index.js';
import { resolveAPIKey } from '../utils/config.js';

// Supported blockchain networks configuration
export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
  // Ethereum Networks
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}',
    fallbackRpcUrls: [
      'https://eth.llamarpc.com',
      'https://ethereum.rpc.blxrbdn.com',
      'https://cloudflare-eth.com'
    ],
    explorerUrl: 'https://etherscan.io',
    explorerApiUrl: 'https://api.etherscan.io/api',
    explorerApiKey: '${ETHERSCAN_API_KEY}',
    gasMultiplier: 1.2,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    testnet: false
  },
  
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}',
    fallbackRpcUrls: [
      'https://endpoints.omniatech.io/v1/eth/sepolia/public'
    ],
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerApiUrl: 'https://api-sepolia.etherscan.io/api',
    explorerApiKey: '${ETHERSCAN_API_KEY}',
    gasMultiplier: 1.5,
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP ETH',
      decimals: 18
    },
    testnet: true
  },

  holesky: {
    chainId: 17000,
    name: 'Holesky Testnet',
    rpcUrl: 'https://ethereum-holesky-rpc.publicnode.com',
    fallbackRpcUrls: [
      'https://endpoints.omniatech.io/v1/eth/holesky/public'
    ],
    explorerUrl: 'https://holesky.etherscan.io',
    explorerApiUrl: 'https://api-holesky.etherscan.io/api',
    explorerApiKey: '${ETHERSCAN_API_KEY}',
    gasMultiplier: 1.5,
    nativeCurrency: {
      name: 'Holesky Ether',
      symbol: 'HOL ETH',
      decimals: 18
    },
    testnet: true
  },

  // Polygon Networks
  polygon: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}',
    fallbackRpcUrls: [
      'https://rpc.ankr.com/polygon',
      'https://polygon-rpc.com',
      'https://rpc-mainnet.matic.network'
    ],
    explorerUrl: 'https://polygonscan.com',
    explorerApiUrl: 'https://api.polygonscan.com/api',
    explorerApiKey: '${POLYGONSCAN_API_KEY}',
    gasMultiplier: 1.2,
    maxFeePerGas: '100000000000', // 100 gwei
    maxPriorityFeePerGas: '30000000000', // 30 gwei
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    testnet: false
  },

  mumbai: {
    chainId: 80001,
    name: 'Mumbai Testnet',
    rpcUrl: 'https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_API_KEY}',
    fallbackRpcUrls: [
      'https://endpoints.omniatech.io/v1/matic/mumbai/public'
    ],
    explorerUrl: 'https://mumbai.polygonscan.com',
    explorerApiUrl: 'https://api-testnet.polygonscan.com/api',
    explorerApiKey: '${POLYGONSCAN_API_KEY}',
    gasMultiplier: 1.5,
    nativeCurrency: {
      name: 'Test MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    testnet: true
  },

  // Arbitrum Networks
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}',
    fallbackRpcUrls: [
      'https://arb1.arbitrum.io/rpc',
      'https://1rpc.io/arb',
      'https://arbitrum.public.blastapi.io'
    ],
    explorerUrl: 'https://arbiscan.io',
    explorerApiUrl: 'https://api.arbiscan.io/api',
    explorerApiKey: '${ARBISCAN_API_KEY}',
    gasMultiplier: 1.1,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    testnet: false
  },

  'arbitrum-sepolia': {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}',
    fallbackRpcUrls: [
      'https://endpoints.omniatech.io/v1/arbitrum/sepolia/public'
    ],
    explorerUrl: 'https://sepolia.arbiscan.io',
    explorerApiUrl: 'https://api-sepolia.arbiscan.io/api',
    explorerApiKey: '${ARBISCAN_API_KEY}',
    gasMultiplier: 1.5,
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    testnet: true
  },

  // Optimism Networks
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}',
    fallbackRpcUrls: [
      'https://mainnet.optimism.io'
    ],
    explorerUrl: 'https://optimistic.etherscan.io',
    explorerApiUrl: 'https://api-optimistic.etherscan.io/api',
    explorerApiKey: '${OPTIMISTIC_ETHERSCAN_API_KEY}',
    gasMultiplier: 1.1,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    testnet: false
  },

  'optimism-sepolia': {
    chainId: 11155420,
    name: 'Optimism Sepolia',
    rpcUrl: 'https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}',
    fallbackRpcUrls: [
      'https://endpoints.omniatech.io/v1/op/sepolia/public'
    ],
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    explorerApiUrl: 'https://api-sepolia-optimistic.etherscan.io/api',
    explorerApiKey: '${OPTIMISTIC_ETHERSCAN_API_KEY}',
    gasMultiplier: 1.5,
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    testnet: true
  },

  // Base Networks
  base: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}',
    fallbackRpcUrls: [
      'https://base.llamarpc.com',
      'https://mainnet.base.org',
      'https://developer-access-mainnet.base.org'
    ],
    explorerUrl: 'https://basescan.org',
    explorerApiUrl: 'https://api.basescan.org/api',
    explorerApiKey: '${BASESCAN_API_KEY}',
    gasMultiplier: 1.1,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    testnet: false
  },

  'base-sepolia': {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}',
    fallbackRpcUrls: [
      'https://endpoints.omniatech.io/v1/base/sepolia/public'
    ],
    explorerUrl: 'https://sepolia.basescan.org',
    explorerApiUrl: 'https://api-sepolia.basescan.org/api',
    explorerApiKey: '${BASESCAN_API_KEY}',
    gasMultiplier: 1.5,
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    testnet: true
  },

  // Avalanche Networks
  avalanche: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    fallbackRpcUrls: [
      'https://avalanche.public-rpc.com'
    ],
    explorerUrl: 'https://snowtrace.io',
    explorerApiUrl: 'https://api.snowtrace.io/api',
    explorerApiKey: '${SNOWTRACE_API_KEY}',
    gasMultiplier: 1.2,
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18
    },
    testnet: false
  },

  fuji: {
    chainId: 43113,
    name: 'Avalanche Fuji Testnet',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    fallbackRpcUrls: [
      'https://endpoints.omniatech.io/v1/avax/fuji/public'
    ],
    explorerUrl: 'https://testnet.snowtrace.io',
    explorerApiUrl: 'https://api-testnet.snowtrace.io/api',
    explorerApiKey: '${SNOWTRACE_API_KEY}',
    gasMultiplier: 1.5,
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18
    },
    testnet: true
  },

  // BSC Networks
  bsc: {
    chainId: 56,
    name: 'BNB Smart Chain',
    rpcUrl: 'https://bsc-dataseed1.binance.org/',
    fallbackRpcUrls: [
      'https://binance.llamarpc.com'
    ],
    explorerUrl: 'https://bscscan.com',
    explorerApiUrl: 'https://api.bscscan.com/api',
    explorerApiKey: '${BSCSCAN_API_KEY}',
    gasMultiplier: 1.2,
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    testnet: false
  },

  'bsc-testnet': {
    chainId: 97,
    name: 'BNB Smart Chain Testnet',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    fallbackRpcUrls: [
      'https://endpoints.omniatech.io/v1/bsc/testnet/public'
    ],
    explorerUrl: 'https://testnet.bscscan.com',
    explorerApiUrl: 'https://api-testnet.bscscan.com/api',
    explorerApiKey: '${BSCSCAN_API_KEY}',
    gasMultiplier: 1.5,
    nativeCurrency: {
      name: 'Test BNB',
      symbol: 'tBNB',
      decimals: 18
    },
    testnet: true
  }
};

/**
 * Get network configuration by name
 */
export function getNetworkConfig(networkName: string): NetworkConfig {
  const config = SUPPORTED_NETWORKS[networkName.toLowerCase()];
  if (!config) {
    throw new Error(`Unsupported network: ${networkName}. Supported networks: ${Object.keys(SUPPORTED_NETWORKS).join(', ')}`);
  }
  return config;
}

/**
 * Get all supported network names
 */
export function getSupportedNetworks(): string[] {
  return Object.keys(SUPPORTED_NETWORKS);
}

/**
 * Get mainnet networks only
 */
export function getMainnetNetworks(): Record<string, NetworkConfig> {
  return Object.fromEntries(
    Object.entries(SUPPORTED_NETWORKS).filter(([_, config]) => !config.testnet)
  );
}

/**
 * Get testnet networks only
 */
export function getTestnetNetworks(): Record<string, NetworkConfig> {
  return Object.fromEntries(
    Object.entries(SUPPORTED_NETWORKS).filter(([_, config]) => config.testnet)
  );
}

/**
 * Replace environment variable placeholders in network config
 */
export async function resolveNetworkConfig(config: NetworkConfig): Promise<NetworkConfig> {
  const resolveEnvVars = async (str: string): Promise<string> => {
    // Use regex to find all ${VAR_NAME} patterns
    const matches = str.matchAll(/\$\{([^}]+)\}/g);
    let result = str;
    
    for (const match of matches) {
      const varName = match[1];
      const placeholder = match[0];
      
      // First try to resolve from saved API keys, then environment
      const value = await resolveAPIKey(varName as any) || process.env[varName];
      
      if (value) {
        result = result.replace(placeholder, value);
      } else {
        console.warn(`API key ${varName} not found in config or environment, will use fallback if available`);
      }
    }
    
    return result;
  };

  // Resolve RPC URL with fallback logic
  let resolvedRpcUrl = await resolveEnvVars(config.rpcUrl);
  
  // If the resolved URL still contains placeholders, use fallback
  if (resolvedRpcUrl.includes('${') && config.fallbackRpcUrls && config.fallbackRpcUrls.length > 0) {
    console.warn(`Using fallback RPC for ${config.name}: ${config.fallbackRpcUrls[0]}`);
    resolvedRpcUrl = config.fallbackRpcUrls[0];
  }

  return {
    ...config,
    rpcUrl: resolvedRpcUrl,
    explorerApiUrl: config.explorerApiUrl ? await resolveEnvVars(config.explorerApiUrl) : undefined,
    explorerApiKey: config.explorerApiKey ? await resolveEnvVars(config.explorerApiKey) : undefined
  };
}