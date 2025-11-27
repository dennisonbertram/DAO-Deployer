// Hook for managing smart contract system deployment
'use client';

import { useState, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { Address } from 'viem';
import { validateRpcUrl } from '@/lib/validation/deploy';

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

interface DeploymentStatus {
  status: 'idle' | 'estimating' | 'deploying' | 'success' | 'error';
  message?: string;
  transactionHash?: string;
  contractAddresses?: {
    factory: string;
    tokenImplementation: string;
    governorImplementation: string;
    timelockImplementation: string;
  };
  gasEstimate?: {
    totalGas: string;
    estimatedCost: string;
  };
  error?: string;
}

interface DeploymentPlan {
  requiresClientSigning: boolean;
  contracts: string[];
  gasEstimate?: string;
  estimatedCost?: string;
}

export function useContractDeployment() {
  const { address } = useAccount();
  const chainId = useChainId();
  
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>({ status: 'idle' });
  const [deploymentPlan, setDeploymentPlan] = useState<DeploymentPlan | null>(null);

  /**
   * Check if contracts are already deployed on the current network
   */
  const checkExistingDeployment = useCallback(async (networkInfo: NetworkInfo) => {
    try {
      const response = await fetch(`/api/deploy-contracts?chainId=${networkInfo.chainId}`, {
        method: 'GET',
      });

      const result = await response.json();
      return result.isDeployed || false;
    } catch (error) {
      return false;
    }
  }, []);

  /**
   * Get deployment plan and gas estimates
   */
  const getDeploymentPlan = useCallback(async (networkInfo: NetworkInfo) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setDeploymentStatus({ status: 'estimating', message: 'Estimating gas costs...' });

    try {
      const response = await fetch('/api/deploy-contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          networkInfo,
          deployerAddress: address,
          // Don't include private key to get deployment plan
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get deployment plan');
      }

      setDeploymentPlan(result);
      setDeploymentStatus({
        status: 'idle',
        gasEstimate: {
          totalGas: result.deploymentPlan?.gasEstimate || '0',
          estimatedCost: result.deploymentPlan?.estimatedCost || '0',
        },
      });

      return result;
    } catch (error) {
      setDeploymentStatus({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }, [address]);

  /**
   * Deploy contracts (server-side with private key - for development only)
   */
  const deployContracts = useCallback(async (
    networkInfo: NetworkInfo,
    privateKey?: string
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setDeploymentStatus({ status: 'deploying', message: 'Starting deployment...' });

    try {
      const response = await fetch('/api/deploy-contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          networkInfo,
          deployerAddress: address,
          deployerPrivateKey: privateKey,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Deployment failed');
      }

      setDeploymentStatus({
        status: 'success',
        message: 'Contracts deployed successfully!',
        transactionHash: result.transactionHash,
        contractAddresses: result.contractAddresses,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDeploymentStatus({
        status: 'error',
        error: errorMessage,
        message: `Deployment failed: ${errorMessage}`,
      });
      throw error;
    }
  }, [address]);

  /**
   * Reset deployment status
   */
  const resetDeployment = useCallback(() => {
    setDeploymentStatus({ status: 'idle' });
    setDeploymentPlan(null);
  }, []);

  /**
   * Validate network configuration
   */
  const validateNetwork = useCallback((networkInfo: NetworkInfo): boolean => {
    if (!networkInfo.chainId || networkInfo.chainId <= 0) {
      return false;
    }

    if (!networkInfo.name || networkInfo.name.trim() === '') {
      return false;
    }

    if (!networkInfo.rpcUrls?.default?.http?.[0]) {
      return false;
    }

    // Validate RPC URL format
    const rpcUrl = networkInfo.rpcUrls.default.http[0];
    const rpcValidation = validateRpcUrl(rpcUrl, true); // Allow HTTP for localhost
    if (!rpcValidation.isValid) {
      console.error('Invalid RPC URL:', rpcValidation.error);
      return false;
    }

    if (!networkInfo.nativeCurrency?.symbol) {
      return false;
    }

    return true;
  }, []);

  /**
   * Check if deployment is supported on the current network
   */
  const isNetworkSupported = useCallback((networkInfo: NetworkInfo): boolean => {
    // Allow localhost in development
    if (networkInfo.chainId === 31337) {
      return true;
    }

    // Known production and testnet networks
    const knownNetworks = {
      // Mainnets
      1: 'Ethereum Mainnet',
      137: 'Polygon Mainnet', 
      42161: 'Arbitrum One',
      10: 'Optimism',
      8453: 'Base',
      43114: 'Avalanche',
      250: 'Fantom',
      56: 'BSC',
      
      // Testnets
      5: 'Goerli Testnet',
      11155111: 'Sepolia Testnet',
      80001: 'Polygon Mumbai',
      421613: 'Arbitrum Goerli',
      420: 'Optimism Goerli',
      84531: 'Base Goerli',
      43113: 'Avalanche Fuji',
      4002: 'Fantom Testnet',
      97: 'BSC Testnet',
    };

    // Allow known networks
    if (knownNetworks[networkInfo.chainId as keyof typeof knownNetworks]) {
      return true;
    }

    // For unknown networks, allow but show warning
    // This enables deployment to custom networks while being explicit about support
    return true;
  }, []);

  return {
    // State
    deploymentStatus,
    deploymentPlan,
    
    // Connected wallet info
    isConnected: !!address,
    deployerAddress: address,
    currentChainId: chainId,
    
    // Actions
    checkExistingDeployment,
    getDeploymentPlan,
    deployContracts,
    resetDeployment,
    
    // Validation
    validateNetwork,
    isNetworkSupported,
    
    // Computed state
    isDeploying: deploymentStatus.status === 'deploying',
    isEstimating: deploymentStatus.status === 'estimating',
    isSuccess: deploymentStatus.status === 'success',
    isError: deploymentStatus.status === 'error',
    isIdle: deploymentStatus.status === 'idle',
  };
}