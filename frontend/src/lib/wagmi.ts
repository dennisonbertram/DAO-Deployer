// RainbowKit and Wagmi configuration for wallet connectivity
'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, arbitrum, optimism, base, sepolia } from 'wagmi/chains';
import { localhost } from './contracts/addresses';

// Configure supported chains
export const chains = [
  mainnet,
  polygon, 
  arbitrum,
  optimism,
  base,
  sepolia,
  localhost,
] as const;

// RainbowKit configuration
export const wagmiConfig = getDefaultConfig({
  appName: 'DAO Deployer',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'dao-deployer-default-id',
  chains,
  ssr: true, // Enable server-side rendering support
});