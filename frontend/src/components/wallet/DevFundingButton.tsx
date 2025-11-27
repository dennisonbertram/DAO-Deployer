// Development-only funding button
'use client';

import { useState } from 'react';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { localhost } from '@/lib/contracts/addresses';
import { useToast } from '@/hooks/use-toast';

export interface DevFundingButtonProps {
  walletAddress: string;
  onNetworkSwitch: (chainId: number) => void;
}

export function DevFundingButton({ walletAddress, onNetworkSwitch }: DevFundingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFundWallet = async () => {
    setIsLoading(true);

    try {
      // First switch to localhost network
      onNetworkSwitch(localhost.id);

      // Small delay to allow network switch to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Call the funding API
      const response = await fetch('/api/dev-fund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fund wallet');
      }

      toast({
        title: "💰 Wallet Funded Successfully!",
        description: `Sent 100 ETH to your wallet. TX: ${data.transactionHash?.slice(0, 10)}...`,
        duration: 5000,
      });

    } catch (error) {
      console.error('Funding error:', error);
      toast({
        title: "❌ Funding Failed",
        description: error instanceof Error ? error.message : 'Failed to fund wallet',
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <button
      onClick={handleFundWallet}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
        "bg-green-600 hover:bg-green-700 text-white",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
      title="Fund wallet with 100 ETH from Anvil (Development only)"
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Funding...
        </>
      ) : (
        <>
          <BanknotesIcon className="w-4 h-4" />
          Fund 100 ETH
        </>
      )}
    </button>
  );
}
