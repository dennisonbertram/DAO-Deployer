// RainbowKit and Wagmi configuration for wallet connectivity
'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { 
  mainnet, 
  polygon, 
  arbitrum, 
  optimism, 
  base, 
  avalanche, 
  fantom, 
  bsc,
  sepolia, 
  goerli,
  polygonMumbai,
  arbitrumGoerli,
  optimismGoerli,
  baseGoerli,
  avalancheFuji,
  fantomTestnet,
  bscTestnet
} from 'wagmi/chains';
import { http } from 'viem';
import { localhost } from './contracts/addresses';

// Include comprehensive chain support for admin deployment
export const chains = [
  // Local development
  localhost,
  
  // Mainnets
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  fantom,
  bsc,
  
  // Testnets  
  sepolia,
  goerli,
  polygonMumbai,
  arbitrumGoerli,
  optimismGoerli,
  baseGoerli,
  avalancheFuji,
  fantomTestnet,
  bscTestnet,
] as const;

// RainbowKit configuration with comprehensive network support
export const wagmiConfig = getDefaultConfig({
  appName: 'DAO Deployer',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains,
  ssr: true, // Enable server-side rendering support
  transports: {
    // Local development
    [localhost.id]: http('http://127.0.0.1:8545'),
    
    // Mainnets - using public RPC endpoints
    [mainnet.id]: http('https://ethereum.publicnode.com'),
    [polygon.id]: http('https://polygon.publicnode.com'),
    [arbitrum.id]: http('https://arbitrum.publicnode.com'),
    [optimism.id]: http('https://optimism.publicnode.com'),
    [base.id]: http('https://base.publicnode.com'),
    [avalanche.id]: http('https://avalanche.publicnode.com'),
    [fantom.id]: http('https://fantom.publicnode.com'),
    [bsc.id]: http('https://bsc.publicnode.com'),
    
    // Testnets - using public RPC endpoints
    [sepolia.id]: http('https://ethereum-sepolia.publicnode.com'),
    [goerli.id]: http('https://ethereum-goerli.publicnode.com'),
    [polygonMumbai.id]: http('https://polygon-mumbai.publicnode.com'),
    [arbitrumGoerli.id]: http('https://arbitrum-goerli.publicnode.com'),
    [optimismGoerli.id]: http('https://optimism-goerli.publicnode.com'),
    [baseGoerli.id]: http('https://base-goerli.publicnode.com'),
    [avalancheFuji.id]: http('https://avalanche-fuji.publicnode.com'),
    [fantomTestnet.id]: http('https://fantom-testnet.publicnode.com'),
    [bscTestnet.id]: http('https://bsc-testnet.publicnode.com'),
  },
});