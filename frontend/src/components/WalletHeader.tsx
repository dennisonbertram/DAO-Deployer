// Wallet connection header component with network switching capabilities
'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useState } from 'react';
import { ChevronDownIcon, PlusIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { chains } from '@/lib/wagmi';
import { localhost } from '@/lib/contracts/addresses';

interface CustomNetworkFormProps {
  onClose: () => void;
  onAdd: (network: any) => void;
}

function CustomNetworkForm({ onClose, onAdd }: CustomNetworkFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    chainId: '',
    rpcUrl: '',
    symbol: '',
    blockExplorer: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const network = {
      id: parseInt(formData.chainId),
      name: formData.name,
      nativeCurrency: { 
        name: formData.symbol, 
        symbol: formData.symbol, 
        decimals: 18 
      },
      rpcUrls: {
        default: { http: [formData.rpcUrl] },
        public: { http: [formData.rpcUrl] },
      },
      blockExplorers: formData.blockExplorer ? {
        default: {
          name: 'Explorer',
          url: formData.blockExplorer,
        }
      } : undefined,
    };
    
    onAdd(network);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <h3 className="text-lg font-semibold mb-4">Add Custom Network</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Network Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Custom Network"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Chain ID</label>
            <input
              type="number"
              value={formData.chainId}
              onChange={(e) => setFormData(prev => ({ ...prev, chainId: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
              placeholder="1234"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">RPC URL</label>
            <input
              type="url"
              value={formData.rpcUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, rpcUrl: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
              placeholder="https://rpc.example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Currency Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
              placeholder="ETH"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Block Explorer URL (Optional)</label>
            <input
              type="url"
              value={formData.blockExplorer}
              onChange={(e) => setFormData(prev => ({ ...prev, blockExplorer: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
              placeholder="https://explorer.example.com"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Network
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface NetworkSelectorProps {
  currentChainId: number;
  onNetworkSwitch: (chainId: number) => void;
  onAddCustomNetwork: () => void;
}

function NetworkSelector({ currentChainId, onNetworkSwitch, onAddCustomNetwork }: NetworkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentChain = chains.find(chain => chain.id === currentChainId);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <span className="text-sm font-medium">
          {currentChain?.name || 'Unknown Network'}
        </span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[200px]">
          <div className="py-1">
            {chains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => {
                  onNetworkSwitch(chain.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors",
                  currentChainId === chain.id && "bg-blue-50 text-blue-600"
                )}
              >
                {chain.name}
              </button>
            ))}
            
            <hr className="my-1" />
            
            <button
              onClick={() => {
                onAddCustomNetwork();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center gap-2 text-blue-600"
            >
              <PlusIcon className="w-4 h-4" />
              Add Custom Network
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface DevFundingButtonProps {
  walletAddress: string;
  onNetworkSwitch: (chainId: number) => void;
}

function DevFundingButton({ walletAddress, onNetworkSwitch }: DevFundingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [isError, setIsError] = useState(false);

  const handleFundWallet = async () => {
    setIsLoading(true);
    setMessage('');
    setIsError(false);

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

      setMessage(`✅ Successfully sent 100 ETH! TX: ${data.transactionHash?.slice(0, 10)}...`);
      setIsError(false);

    } catch (error) {
      console.error('Funding error:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to fund wallet');
      setIsError(true);
    } finally {
      setIsLoading(false);
      // Clear message after 5 seconds
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="flex flex-col items-end">
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
      
      {message && (
        <div className={cn(
          "mt-1 text-xs px-2 py-1 rounded",
          isError ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
        )}>
          {message}
        </div>
      )}
    </div>
  );
}

export function WalletHeader() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [showCustomNetworkForm, setShowCustomNetworkForm] = useState(false);

  const handleNetworkSwitch = (newChainId: number) => {
    if (switchChain) {
      switchChain({ chainId: newChainId });
    }
  };

  const handleAddCustomNetwork = async (network: any) => {
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
      }
    } catch (error) {
      console.error('Failed to add custom network:', error);
    }
  };

  return (
    <>
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">DAO Deployer</h1>
            </div>
            
            <div className="flex items-center gap-4">
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
              
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === 'authenticated');

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        style: {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <button
                              onClick={openConnectModal}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                              type="button"
                            >
                              Connect Wallet
                            </button>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <button
                              onClick={openChainModal}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                              type="button"
                            >
                              Wrong network
                            </button>
                          );
                        }

                        return (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={openChainModal}
                              className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg font-medium transition-colors text-sm"
                              type="button"
                            >
                              {chain.hasIcon && (
                                <div
                                  style={{
                                    background: chain.iconBackground,
                                    width: 16,
                                    height: 16,
                                    borderRadius: 999,
                                    overflow: 'hidden',
                                    marginRight: 8,
                                    display: 'inline-block',
                                  }}
                                >
                                  {chain.iconUrl && (
                                    <img
                                      alt={chain.name ?? 'Chain icon'}
                                      src={chain.iconUrl}
                                      style={{ width: 16, height: 16 }}
                                    />
                                  )}
                                </div>
                              )}
                              {chain.name}
                            </button>

                            <button
                              onClick={openAccountModal}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                              type="button"
                            >
                              {account.displayName}
                              {account.displayBalance
                                ? ` (${account.displayBalance})`
                                : ''}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>
        </div>
      </header>

      {showCustomNetworkForm && (
        <CustomNetworkForm
          onClose={() => setShowCustomNetworkForm(false)}
          onAdd={handleAddCustomNetwork}
        />
      )}
    </>
  );
}