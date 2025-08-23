import { z } from 'zod';
import { 
  SUPPORTED_NETWORKS, 
  getSupportedNetworks, 
  getMainnetNetworks, 
  getTestnetNetworks 
} from '../networks/index.js';

// Input validation schema for the list-networks tool
export const ListNetworksInputSchema = z.object({
  includeTestnets: z.boolean().default(true),
  includeMainnets: z.boolean().default(true),
  format: z.enum(['table', 'json', 'summary']).default('table')
});

export interface NetworkInfo {
  name: string;
  chainId: number;
  displayName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  testnet: boolean;
  hasExplorer: boolean;
  hasVerification: boolean;
}

/**
 * List all supported blockchain networks
 */
export async function listNetworks(input: z.infer<typeof ListNetworksInputSchema>): Promise<NetworkInfo[]> {
  const config = ListNetworksInputSchema.parse(input);
  
  let networksToShow = SUPPORTED_NETWORKS;
  
  // Filter by network type
  if (!config.includeTestnets && !config.includeMainnets) {
    return []; // Return empty if both are excluded
  } else if (!config.includeTestnets) {
    networksToShow = getMainnetNetworks();
  } else if (!config.includeMainnets) {
    networksToShow = getTestnetNetworks();
  }
  
  // Convert to NetworkInfo format
  const networks: NetworkInfo[] = Object.entries(networksToShow).map(([name, config]) => ({
    name,
    chainId: config.chainId,
    displayName: config.name,
    nativeCurrency: config.nativeCurrency,
    testnet: config.testnet,
    hasExplorer: !!config.explorerUrl,
    hasVerification: !!config.explorerApiUrl && !!config.explorerApiKey
  }));
  
  // Sort by chain ID for consistent ordering
  return networks.sort((a, b) => a.chainId - b.chainId);
}

/**
 * Format network list for display
 */
export function formatNetworkList(networks: NetworkInfo[], format: 'table' | 'json' | 'summary'): string {
  if (format === 'json') {
    return JSON.stringify(networks, null, 2);
  }
  
  if (format === 'summary') {
    return formatNetworkSummary(networks);
  }
  
  // Default to table format
  return formatNetworkTable(networks);
}

/**
 * Format networks as a table
 */
function formatNetworkTable(networks: NetworkInfo[]): string {
  const sections = [
    '# 🌍 Supported Blockchain Networks',
    '',
    '| Network | Chain ID | Native Currency | Type | Explorer | Verification |',
    '|---------|----------|-----------------|------|----------|--------------|'
  ];
  
  networks.forEach(network => {
    const type = network.testnet ? '🧪 Testnet' : '🌟 Mainnet';
    const explorer = network.hasExplorer ? '✅' : '❌';
    const verification = network.hasVerification ? '✅' : '❌';
    const currency = `${network.nativeCurrency.symbol}`;
    
    sections.push(
      `| ${network.displayName} | ${network.chainId} | ${currency} | ${type} | ${explorer} | ${verification} |`
    );
  });
  
  sections.push(
    '',
    '## Legend',
    '- **Explorer**: Block explorer available for viewing transactions',
    '- **Verification**: Contract verification supported on block explorer',
    '',
    `**Total Networks:** ${networks.length}`,
    `**Mainnets:** ${networks.filter(n => !n.testnet).length}`,
    `**Testnets:** ${networks.filter(n => n.testnet).length}`
  );
  
  return sections.join('\n');
}

/**
 * Format networks as a summary
 */
function formatNetworkSummary(networks: NetworkInfo[]): string {
  const mainnets = networks.filter(n => !n.testnet);
  const testnets = networks.filter(n => n.testnet);
  
  const sections = [
    '# 🌍 Network Summary',
    '',
    `**Total Supported Networks:** ${networks.length}`,
    ''
  ];
  
  if (mainnets.length > 0) {
    sections.push(
      '## 🌟 Mainnet Networks',
      '',
      ...mainnets.map(n => `- **${n.displayName}** (${n.chainId}) - ${n.nativeCurrency.symbol}`),
      ''
    );
  }
  
  if (testnets.length > 0) {
    sections.push(
      '## 🧪 Testnet Networks',
      '',
      ...testnets.map(n => `- **${n.displayName}** (${n.chainId}) - ${n.nativeCurrency.symbol}`),
      ''
    );
  }
  
  // Group by ecosystem
  const ecosystems = groupNetworksByEcosystem(networks);
  sections.push(
    '## 🏗️ Supported Ecosystems',
    '',
    ...Object.entries(ecosystems).map(([ecosystem, networkCount]) => 
      `- **${ecosystem}**: ${networkCount} networks`
    )
  );
  
  return sections.join('\n');
}

/**
 * Group networks by ecosystem for summary
 */
function groupNetworksByEcosystem(networks: NetworkInfo[]): Record<string, number> {
  const ecosystems: Record<string, number> = {};
  
  networks.forEach(network => {
    const name = network.displayName.toLowerCase();
    let ecosystem = 'Other';
    
    if (name.includes('ethereum') || name.includes('sepolia') || name.includes('holesky')) {
      ecosystem = 'Ethereum';
    } else if (name.includes('polygon') || name.includes('mumbai')) {
      ecosystem = 'Polygon';
    } else if (name.includes('arbitrum')) {
      ecosystem = 'Arbitrum';
    } else if (name.includes('optimism')) {
      ecosystem = 'Optimism';
    } else if (name.includes('base')) {
      ecosystem = 'Base';
    } else if (name.includes('avalanche') || name.includes('fuji')) {
      ecosystem = 'Avalanche';
    } else if (name.includes('bnb') || name.includes('bsc')) {
      ecosystem = 'BNB Chain';
    }
    
    ecosystems[ecosystem] = (ecosystems[ecosystem] || 0) + 1;
  });
  
  return ecosystems;
}

/**
 * Get network configuration with validation
 */
export function getNetworkDetails(networkName: string): NetworkInfo | null {
  const config = SUPPORTED_NETWORKS[networkName.toLowerCase()];
  if (!config) {
    return null;
  }
  
  return {
    name: networkName.toLowerCase(),
    chainId: config.chainId,
    displayName: config.name,
    nativeCurrency: config.nativeCurrency,
    testnet: config.testnet,
    hasExplorer: !!config.explorerUrl,
    hasVerification: !!config.explorerApiUrl && !!config.explorerApiKey
  };
}

/**
 * Validate if a network name is supported
 */
export function isNetworkSupported(networkName: string): boolean {
  return networkName.toLowerCase() in SUPPORTED_NETWORKS;
}

/**
 * Get recommended networks for different use cases
 */
export function getRecommendedNetworks(): {
  development: string[];
  staging: string[];
  production: string[];
} {
  return {
    development: ['sepolia', 'mumbai', 'fuji'], // Free/cheap testnets
    staging: ['holesky', 'arbitrum-sepolia', 'base-sepolia'], // More production-like testnets
    production: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'] // Major mainnets
  };
}

/**
 * Estimate deployment costs for different networks
 */
export function getNetworkDeploymentCosts(): Record<string, { gasPrice: string; estimatedCost: string }> {
  return {
    ethereum: { gasPrice: '~20-50 gwei', estimatedCost: '~$50-200' },
    polygon: { gasPrice: '~30-100 gwei', estimatedCost: '~$1-5' },
    arbitrum: { gasPrice: '~0.1-0.5 gwei', estimatedCost: '~$5-20' },
    optimism: { gasPrice: '~0.1-0.5 gwei', estimatedCost: '~$5-20' },
    base: { gasPrice: '~0.1-0.5 gwei', estimatedCost: '~$5-20' },
    avalanche: { gasPrice: '~25-50 gwei', estimatedCost: '~$2-8' },
    bsc: { gasPrice: '~5-20 gwei', estimatedCost: '~$1-3' },
    // Testnets
    sepolia: { gasPrice: '~1-5 gwei', estimatedCost: 'Free (testnet)' },
    mumbai: { gasPrice: '~1-10 gwei', estimatedCost: 'Free (testnet)' },
    fuji: { gasPrice: '~25-50 gwei', estimatedCost: 'Free (testnet)' }
  };
}