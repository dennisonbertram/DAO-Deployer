'use client'

import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { Address, Chain } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useContractDeployment } from '@/hooks/useContractDeployment';

interface NetworkInfo {
  chainId: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: {
      http: string[];
    };
  };
  blockExplorers?: {
    default: {
      name: string;
      url: string;
    };
  };
}

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { toast } = useToast();
  
  const {
    deploymentStatus,
    deploymentPlan,
    isDeploying,
    isEstimating,
    isSuccess,
    isError,
    isIdle,
    getDeploymentPlan,
    deployContracts,
    resetDeployment,
    validateNetwork,
    isNetworkSupported,
    checkExistingDeployment,
  } = useContractDeployment();
  
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [customNetworkInfo, setCustomNetworkInfo] = useState<Partial<NetworkInfo>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [hasExistingDeployment, setHasExistingDeployment] = useState(false);
  const [testnetOnlyMode, setTestnetOnlyMode] = useState(true); // Default to safe mode

  // Apply visual feedback when testnet-only mode is active
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const modifyNetworkOptions = () => {
      // Find all network option buttons in RainbowKit
      const networkButtons = document.querySelectorAll('[data-rk] button');
      
      networkButtons.forEach((button) => {
        const buttonElement = button as HTMLElement;
        const textContent = buttonElement.textContent || '';
        
        // Define mainnet networks to gray out
        const isMainnet = (
          (textContent.includes('Ethereum') && !textContent.includes('Sepolia') && !textContent.includes('Goerli')) ||
          (textContent.includes('Polygon') && !textContent.includes('Mumbai')) ||
          textContent.includes('Arbitrum One') ||
          textContent.includes('OP Mainnet') ||
          (textContent.includes('Base') && !textContent.includes('Goerli')) ||
          (textContent.includes('Avalanche') && !textContent.includes('Fuji')) ||
          (textContent.includes('Fantom') && !textContent.includes('Testnet')) ||
          (textContent.includes('BNB') && !textContent.includes('Testnet'))
        );
        
        if (testnetOnlyMode && isMainnet) {
          buttonElement.style.opacity = '0.4';
          buttonElement.style.pointerEvents = 'none';
          buttonElement.style.position = 'relative';
          
          // Add blocked indicator if not already present
          if (!buttonElement.querySelector('.blocked-indicator')) {
            const indicator = document.createElement('span');
            indicator.className = 'blocked-indicator';
            indicator.textContent = '🚫';
            indicator.style.position = 'absolute';
            indicator.style.right = '8px';
            indicator.style.top = '50%';
            indicator.style.transform = 'translateY(-50%)';
            indicator.style.fontSize = '12px';
            buttonElement.appendChild(indicator);
          }
        } else {
          // Reset styles when not in testnet-only mode
          buttonElement.style.opacity = '';
          buttonElement.style.pointerEvents = '';
          buttonElement.style.position = '';
          
          // Remove blocked indicator
          const indicator = buttonElement.querySelector('.blocked-indicator');
          if (indicator) {
            indicator.remove();
          }
        }
      });
    };

    // Apply immediately
    modifyNetworkOptions();
    
    // Set up observer for dynamic content changes
    const observer = new MutationObserver(() => {
      modifyNetworkOptions();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    return () => {
      observer.disconnect();
    };
  }, [testnetOnlyMode]);

  // Get network information from connected wallet
  useEffect(() => {
    if (chainId && isConnected) {
      // Get network info from wallet
      const getNetworkInfo = async () => {
        try {
          // Use ethereum provider to get network details
          if (typeof window !== 'undefined' && window.ethereum) {
            const provider = window.ethereum;
            
            // Get network name from common chain mappings
            const networkNames: Record<number, string> = {
              1: 'Ethereum Mainnet',
              5: 'Goerli Testnet',
              11155111: 'Sepolia Testnet',
              137: 'Polygon Mainnet',
              80001: 'Polygon Mumbai',
              42161: 'Arbitrum One',
              421613: 'Arbitrum Goerli',
              10: 'Optimism',
              420: 'Optimism Goerli',
              31337: 'Localhost'
            };

            const blockExplorers: Record<number, { name: string; url: string }> = {
              1: { name: 'Etherscan', url: 'https://etherscan.io' },
              5: { name: 'Etherscan', url: 'https://goerli.etherscan.io' },
              11155111: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
              137: { name: 'Polygonscan', url: 'https://polygonscan.com' },
              80001: { name: 'Polygonscan', url: 'https://mumbai.polygonscan.com' },
              42161: { name: 'Arbiscan', url: 'https://arbiscan.io' },
              421613: { name: 'Arbiscan', url: 'https://goerli.arbiscan.io' },
              10: { name: 'Optimistic Etherscan', url: 'https://optimistic.etherscan.io' },
              420: { name: 'Optimistic Etherscan', url: 'https://goerli-optimism.etherscan.io' },
            };

            const rpcUrls: Record<number, string[]> = {
              1: ['https://ethereum.publicnode.com'],
              5: ['https://ethereum-goerli.publicnode.com'],
              11155111: ['https://ethereum-sepolia.publicnode.com'],
              137: ['https://polygon.publicnode.com'],
              80001: ['https://polygon-mumbai.publicnode.com'],
              42161: ['https://arbitrum-one.publicnode.com'],
              421613: ['https://arbitrum-goerli.publicnode.com'],
              10: ['https://optimism.publicnode.com'],
              420: ['https://optimism-goerli.publicnode.com'],
              31337: ['http://127.0.0.1:8545'],
            };

            const networkInfo: NetworkInfo = {
              chainId,
              name: networkNames[chainId] || `Unknown Network (${chainId})`,
              nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: {
                default: {
                  http: rpcUrls[chainId] || [`https://chainid-${chainId}.example.com`],
                },
              },
              blockExplorers: blockExplorers[chainId] ? {
                default: blockExplorers[chainId]
              } : undefined,
            };

            setNetworkInfo(networkInfo);
            setCustomNetworkInfo(networkInfo);
            
            // Check for existing deployment
            checkExistingDeployment(networkInfo).then(exists => {
              setHasExistingDeployment(exists);
            });
          }
        } catch (error) {
          console.error('Error getting network info:', error);
          toast({
            title: 'Error',
            description: 'Failed to get network information',
            variant: 'destructive',
          });
        }
      };

      getNetworkInfo();
    } else {
      setNetworkInfo(null);
      setCustomNetworkInfo({});
      setHasExistingDeployment(false);
    }
  }, [chainId, isConnected, toast, checkExistingDeployment]);

  const handleGetEstimate = async () => {
    if (!customNetworkInfo || !validateNetwork(customNetworkInfo as NetworkInfo)) {
      toast({
        title: 'Error',
        description: 'Please provide valid network information',
        variant: 'destructive',
      });
      return;
    }

    try {
      await getDeploymentPlan(customNetworkInfo as NetworkInfo);
      toast({
        title: 'Gas Estimate Ready',
        description: 'Deployment gas costs estimated successfully',
      });
    } catch (error) {
      toast({
        title: 'Estimation Failed',
        description: error instanceof Error ? error.message : 'Failed to estimate gas costs',
        variant: 'destructive',
      });
    }
  };

  const getNetworkType = (chainId: number): 'mainnet' | 'testnet' | 'local' | 'unknown' => {
    if (chainId === 31337) return 'local';
    
    const mainnets = [1, 137, 42161, 10, 8453, 43114, 250, 56];
    const testnets = [5, 11155111, 80001, 421613, 420, 84531, 43113, 4002, 97];
    
    if (mainnets.includes(chainId)) return 'mainnet';
    if (testnets.includes(chainId)) return 'testnet';
    return 'unknown';
  };

  const handleDeploy = async () => {
    if (!customNetworkInfo || !validateNetwork(customNetworkInfo as NetworkInfo)) {
      toast({
        title: 'Error',
        description: 'Please provide valid network information',
        variant: 'destructive',
      });
      return;
    }

    const networkType = getNetworkType(customNetworkInfo.chainId!);
    
    // Check testnet-only mode restrictions
    if (testnetOnlyMode && networkType === 'mainnet') {
      toast({
        title: 'Testnet Only Mode',
        description: 'Mainnet deployment is disabled in testnet-only mode. Toggle the setting to enable mainnet deployments.',
        variant: 'destructive',
      });
      return;
    }
    
    // Show confirmation for mainnet deployments
    if (networkType === 'mainnet') {
      const confirmed = window.confirm(
        `⚠️ You are about to deploy to ${customNetworkInfo.name} (MAINNET).\n\n` +
        `This will deploy contracts using real ETH and the deployment will be permanent.\n\n` +
        `Are you sure you want to continue?`
      );
      
      if (!confirmed) {
        return;
      }
    }

    // Show warning for unknown networks
    if (networkType === 'unknown') {
      const confirmed = window.confirm(
        `⚠️ You are deploying to an unknown network (Chain ID: ${customNetworkInfo.chainId}).\n\n` +
        `Please verify this is the correct network before proceeding.\n\n` +
        `Continue with deployment?`
      );
      
      if (!confirmed) {
        return;
      }
    }

    try {
      // For development/localhost, we can use a hardcoded private key (Anvil default)
      // For other networks, deployment should be handled client-side or with proper key management
      let privateKey: string | undefined;
      if (networkType === 'local') {
        privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
      }

      await deployContracts(customNetworkInfo as NetworkInfo, privateKey);
      
      toast({
        title: 'Success',
        description: `Smart contracts deployed successfully to ${customNetworkInfo.name}!`,
      });
      
      // Refresh existing deployment check
      setHasExistingDeployment(true);
    } catch (error) {
      toast({
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleNetworkInfoChange = (field: keyof NetworkInfo, value: any) => {
    setCustomNetworkInfo(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
          <p className="text-gray-600 mb-6">Connect your wallet to deploy smart contracts</p>
          <ConnectButton />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Deploy smart contract system to any network</p>
            </div>
            
            {/* Testnet Only Mode Toggle */}
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">
                Testnet Only Mode
              </label>
              <button
                onClick={() => setTestnetOnlyMode(!testnetOnlyMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  testnetOnlyMode ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    testnetOnlyMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs ${testnetOnlyMode ? 'text-green-600' : 'text-gray-500'}`}>
                {testnetOnlyMode ? 'SAFE' : 'UNRESTRICTED'}
              </span>
            </div>
          </div>
          
          {testnetOnlyMode && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <span className="text-green-600 mr-2">🛡️</span>
                <span className="text-green-800 text-sm">
                  <strong>Testnet Only Mode:</strong> Mainnet deployments are disabled for safety. 
                  Only localhost and testnet deployments are allowed.
                </span>
              </div>
            </div>
          )}
          
          {!testnetOnlyMode && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <span className="text-orange-600 mr-2">⚠️</span>
                <span className="text-orange-800 text-sm">
                  <strong>Unrestricted Mode:</strong> Mainnet deployments are enabled. 
                  Please exercise caution when deploying to production networks.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Network Information */}
        <Card className="p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Network Information</h2>
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Save Changes' : 'Edit'}
            </Button>
          </div>

          {networkInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Network Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={customNetworkInfo.name || ''}
                    onChange={(e) => handleNetworkInfoChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-gray-900">{customNetworkInfo.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chain ID
                </label>
                <p className="text-gray-900">{networkInfo.chainId}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Native Currency
                </label>
                <p className="text-gray-900">
                  {networkInfo.nativeCurrency.name} ({networkInfo.nativeCurrency.symbol})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RPC URL
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={customNetworkInfo.rpcUrls?.default.http[0] || ''}
                    onChange={(e) => handleNetworkInfoChange('rpcUrls', {
                      default: { http: [e.target.value] }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <p className="text-gray-900 text-sm font-mono">
                    {customNetworkInfo.rpcUrls?.default.http[0]}
                  </p>
                )}
              </div>

              {networkInfo.blockExplorers && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Block Explorer
                  </label>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Explorer Name"
                        value={customNetworkInfo.blockExplorers?.default.name || ''}
                        onChange={(e) => handleNetworkInfoChange('blockExplorers', {
                          default: {
                            name: e.target.value,
                            url: customNetworkInfo.blockExplorers?.default.url || ''
                          }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <input
                        type="text"
                        placeholder="Explorer URL"
                        value={customNetworkInfo.blockExplorers?.default.url || ''}
                        onChange={(e) => handleNetworkInfoChange('blockExplorers', {
                          default: {
                            name: customNetworkInfo.blockExplorers?.default.name || '',
                            url: e.target.value
                          }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900">{customNetworkInfo.blockExplorers?.default.name}</span>
                      <span className="text-gray-500">-</span>
                      <a
                        href={customNetworkInfo.blockExplorers?.default.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-mono"
                      >
                        {customNetworkInfo.blockExplorers?.default.url}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Deployment Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Deploy Smart Contract System</h2>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              This will deploy the complete DAO smart contract system including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mb-4">
              <li>Token Implementation Contract</li>
              <li>Governor Implementation Contract</li>
              <li>Timelock Implementation Contract</li>
              <li>Factory Contract</li>
            </ul>
          </div>

          {/* Existing Deployment Warning */}
          {hasExistingDeployment && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Contracts Already Deployed</h3>
              <p className="text-yellow-700">Smart contracts appear to already be deployed on this network.</p>
            </div>
          )}

          {/* Gas Estimate */}
          {deploymentPlan && deploymentStatus.gasEstimate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Gas Estimate</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Estimated Gas:</span>
                  <span className="font-mono">{deploymentStatus.gasEstimate.totalGas}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Estimated Cost:</span>
                  <span className="font-mono">{deploymentStatus.gasEstimate.estimatedCost} ETH</span>
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  * Estimates are approximate and may vary based on network conditions
                </div>
              </div>
            </div>
          )}

          {/* Success Status */}
          {isSuccess && deploymentStatus.contractAddresses && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-green-900 mb-3">Deployment Successful!</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Factory:</span>
                  <span className="font-mono text-xs">{deploymentStatus.contractAddresses.factory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Token Implementation:</span>
                  <span className="font-mono text-xs">{deploymentStatus.contractAddresses.tokenImplementation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Governor Implementation:</span>
                  <span className="font-mono text-xs">{deploymentStatus.contractAddresses.governorImplementation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Timelock Implementation:</span>
                  <span className="font-mono text-xs">{deploymentStatus.contractAddresses.timelockImplementation}</span>
                </div>
                {deploymentStatus.transactionHash && (
                  <div className="flex justify-between">
                    <span className="font-medium">Transaction Hash:</span>
                    <span className="font-mono text-xs">{deploymentStatus.transactionHash}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Status */}
          {isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Deployment Failed</h3>
              <p className="text-red-700">{deploymentStatus.error || deploymentStatus.message}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Connected to: <span className="font-medium">{networkInfo?.name}</span>
                  {customNetworkInfo.chainId && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      getNetworkType(customNetworkInfo.chainId) === 'mainnet' 
                        ? 'bg-red-100 text-red-800'
                        : getNetworkType(customNetworkInfo.chainId) === 'testnet'
                        ? 'bg-yellow-100 text-yellow-800' 
                        : getNetworkType(customNetworkInfo.chainId) === 'local'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {getNetworkType(customNetworkInfo.chainId).toUpperCase()}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-600">
                  Deployer: <span className="font-mono text-xs">{address}</span>
                </p>
                {customNetworkInfo.chainId && getNetworkType(customNetworkInfo.chainId) === 'mainnet' && (
                  <p className={`text-sm mt-1 ${testnetOnlyMode ? 'text-red-600' : 'text-orange-600'}`}>
                    {testnetOnlyMode 
                      ? '🚫 Mainnet deployment blocked by testnet-only mode'
                      : '⚠️ Production network - deployment will use real ETH'
                    }
                  </p>
                )}
                {customNetworkInfo.chainId && getNetworkType(customNetworkInfo.chainId) === 'unknown' && (
                  <p className="text-sm text-yellow-600 mt-1">
                    ⚠️ Unknown network - please verify configuration
                  </p>
                )}
              </div>
              
              <div className="flex space-x-3">
                {!deploymentPlan && !hasExistingDeployment && (
                  <Button
                    onClick={handleGetEstimate}
                    disabled={isEstimating || !validateNetwork(customNetworkInfo as NetworkInfo)}
                    variant="outline"
                    className="px-4 py-2"
                  >
                    {isEstimating ? 'Estimating...' : 'Get Gas Estimate'}
                  </Button>
                )}
                
                <Button
                  onClick={handleDeploy}
                  disabled={
                    isDeploying || 
                    hasExistingDeployment || 
                    !validateNetwork(customNetworkInfo as NetworkInfo) ||
                    (testnetOnlyMode && typeof customNetworkInfo.chainId === 'number' && getNetworkType(customNetworkInfo.chainId) === 'mainnet')
                  }
                  className="px-6 py-2"
                >
                  {isDeploying ? 'Deploying...' : 
                   (testnetOnlyMode && typeof customNetworkInfo.chainId === 'number' && getNetworkType(customNetworkInfo.chainId) === 'mainnet') ? 'Mainnet Blocked' :
                   'Deploy Contracts'}
                </Button>
              </div>
            </div>

            {(isDeploying || isEstimating) && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">{deploymentStatus.message}</span>
              </div>
            )}

            {isSuccess && (
              <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                <span className="text-green-700 font-medium">🎉 Deployment completed successfully!</span>
                <Button
                  onClick={resetDeployment}
                  variant="outline"
                  size="sm"
                >
                  Reset
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}