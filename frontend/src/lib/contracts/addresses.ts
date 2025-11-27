// Contract addresses configuration for DAO Deployer
import { Address } from 'viem';
import { mainnet, polygon, arbitrum, optimism, base, sepolia } from 'viem/chains';

// Local development chain configuration
export const localhost = {
  id: 31337,
  name: 'Localhost',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
} as const;

// Factory address will be deterministic across all networks using CREATE2
export const FACTORY_ADDRESS = "0x[FACTORY_ADDRESS_TO_BE_DEPLOYED]" as const satisfies Address;

// Network-specific contract addresses
export const CONTRACT_ADDRESSES = {
  [mainnet.id]: {
    factory: FACTORY_ADDRESS,
  },
  [polygon.id]: {
    factory: FACTORY_ADDRESS, // Same address due to CREATE2 deployment
  },
  [arbitrum.id]: {
    factory: FACTORY_ADDRESS,
  },
  [optimism.id]: {
    factory: FACTORY_ADDRESS,
  },
  [base.id]: {
    factory: FACTORY_ADDRESS,
  },
  [sepolia.id]: {
    factory: FACTORY_ADDRESS, // For testing
  },
  [localhost.id]: {
    factory: "0x0000000000000000000000000000000000000000" as Address, // Will be loaded dynamically
  },
} as const;

// Supported chain IDs for type safety
export type SupportedChainId = keyof typeof CONTRACT_ADDRESSES;

// Helper function to get contract address for a specific chain
export function getContractAddress(
  chainId: SupportedChainId,
  contract: 'factory'
): Address {
  const address = CONTRACT_ADDRESSES[chainId]?.[contract];
  if (!address) {
    throw new Error(`Contract ${contract} not found for chain ${chainId}`);
  }
  return address;
}

// Helper function to check if chain is supported
export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return chainId in CONTRACT_ADDRESSES;
}

// Local contract addresses interface
interface LocalContractAddresses {
  chainId: number;
  factory: Address;
  tokenImplementation: Address;
  governorImplementation: Address;
  timelockImplementation: Address;
  deployedAt: number;
  blockNumber: number;
}

// Storage for local addresses
let localAddresses: LocalContractAddresses | null = null;

/**
 * Load contract addresses from local deployment file
 * This is used for development with Anvil
 */
export async function loadLocalAddresses(): Promise<LocalContractAddresses | null> {
  if (typeof window === 'undefined') return null; // Server-side rendering
  
  try {
    // Try to fetch from the contracts directory
    const response = await fetch('/local-contracts.json');
    if (response.ok) {
      localAddresses = await response.json();
      return localAddresses;
    }
  } catch (error) {
    // Failed to load local contract addresses
  }

  return null;
}

/**
 * Get contract address with support for dynamic local addresses
 */
export async function getContractAddressAsync(
  chainId: SupportedChainId,
  contract: 'factory'
): Promise<Address> {
  // For localhost, try to load dynamic addresses
  if (chainId === localhost.id) {
    const local = localAddresses || await loadLocalAddresses();
    if (local && local.factory !== "0x0000000000000000000000000000000000000000") {
      return local.factory;
    }
    throw new Error(`Local contract ${contract} not deployed yet. Run 'npm run dev:local' to deploy.`);
  }
  
  // For other chains, use static configuration
  return getContractAddress(chainId, contract);
}

/**
 * Check if local contracts are available
 */
export function areLocalContractsAvailable(): boolean {
  return localAddresses !== null && localAddresses.factory !== "0x0000000000000000000000000000000000000000";
}