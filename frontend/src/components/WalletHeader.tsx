// Wallet connection header component with network switching capabilities
'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  NetworkSelector,
  CustomNetworkModal,
  DevFundingButton,
  WalletButton,
  NavigationLinks,
  type CustomNetwork
} from '@/components/wallet';

export function WalletHeader() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [showCustomNetworkForm, setShowCustomNetworkForm] = useState(false);
  const { toast } = useToast();

  const handleNetworkSwitch = (newChainId: number) => {
    if (switchChain) {
      switchChain({ chainId: newChainId });
    }
  };

  const handleAddCustomNetwork = async (network: CustomNetwork) => {
    try {
      // Use window.ethereum to add the network directly to the wallet
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${network.id.toString(16)}`,
            chainName: network.name,
            nativeCurrency: network.nativeCurrency,
            rpcUrls: network.rpcUrls.default.http,
            blockExplorerUrls: network.blockExplorers?.default ? [network.blockExplorers.default.url] : [],
          }],
        });
        setShowCustomNetworkForm(false);
        toast({
          title: 'Network added',
          description: `${network.name} has been added to your wallet.`,
        } as any);
      }
    } catch (error) {
      console.error('Failed to add custom network:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add network';
      toast({
        title: 'Failed to add network',
        description: errorMessage.includes('User rejected') || errorMessage.includes('user denied')
          ? 'Network addition was cancelled.'
          : 'Failed to add the custom network to your wallet. Please try again.',
        variant: 'destructive',
      } as any);
    }
  };

  return (
    <>
      <header className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
                DAO Deployer
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <NavigationLinks />

              {isConnected && (
                <NetworkSelector
                  currentChainId={chainId}
                  onNetworkSwitch={handleNetworkSwitch}
                  onAddCustomNetwork={() => setShowCustomNetworkForm(true)}
                />
              )}

              {isConnected && address && (
                <DevFundingButton
                  walletAddress={address}
                  onNetworkSwitch={handleNetworkSwitch}
                />
              )}

              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {showCustomNetworkForm && (
        <CustomNetworkModal
          onClose={() => setShowCustomNetworkForm(false)}
          onAdd={handleAddCustomNetwork}
        />
      )}
    </>
  );
}
