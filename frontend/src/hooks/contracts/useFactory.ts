// Factory contract hooks for DAO deployment and discovery
'use client';

import { useReadContract, useWriteContract, useWatchContractEvent, useChainId, useAccount, usePublicClient } from 'wagmi';
import { useEffect, useMemo, useState } from 'react';
import { Address, Hash } from 'viem';

import { 
  FACTORY_ABI, 
  getContractAddress, 
  getContractAddressAsync,
  isSupportedChain,
  localhost,
  DeployedDAO,
  GAS_LIMITS
} from '@/lib/contracts';
import { DAOConfig as ContractDAOConfig } from '@/lib/contracts/types';
import { DAOConfig } from '@/types/deploy';

/**
 * Hook for getting factory contract address with support for local development
 */
function useFactoryAddress() {
  const chainId = useChainId();
  const [factoryAddress, setFactoryAddress] = useState<Address | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAddress() {
      console.info('[Factory] Resolving factory address', { chainId });
      if (!isSupportedChain(chainId)) {
        setFactoryAddress(undefined);
        setIsLoading(false);
        return;
      }

      try {
        if (chainId === localhost.id) {
          // For localhost, use async loading to get dynamic addresses
          const address = await getContractAddressAsync(chainId, 'factory');
          console.info('[Factory] Loaded local factory address', { address });
          setFactoryAddress(address);
        } else {
          // For other chains, use static configuration
          const address = getContractAddress(chainId, 'factory');
          console.info('[Factory] Loaded factory address', { address });
          setFactoryAddress(address);
        }
      } catch (error) {
        console.warn('Failed to load factory address:', error);
        setFactoryAddress(undefined);
      } finally {
        setIsLoading(false);
      }
    }

    loadAddress();
  }, [chainId]);

  return { factoryAddress, isLoading };
}

/**
 * Hook for reading all DAOs from the factory
 */
export function useAllDAOs() {
  const { factoryAddress, isLoading: addressLoading } = useFactoryAddress();

  const {
    data: allDAOs,
    isError,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'getAllDAOs',
    query: {
      enabled: !!factoryAddress,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  });

  return {
    daos: (allDAOs as DeployedDAO[]) || [],
    isLoading: isLoading || addressLoading,
    isError,
    error,
    refetch,
  };
}

/**
 * Hook for reading DAOs by a specific deployer
 */
export function useDAOsByDeployer(deployer?: Address) {
  const { factoryAddress, isLoading: addressLoading } = useFactoryAddress();

  const {
    data: deployerDAOs,
    isError,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'getDAOsByDeployer',
    args: deployer ? [deployer] : undefined,
    query: {
      enabled: !!factoryAddress && !!deployer,
    },
  });

  return {
    daos: (deployerDAOs as DeployedDAO[]) || [],
    isLoading: isLoading || addressLoading,
    isError,
    error,
    refetch,
  };
}

/**
 * Hook for getting the total count of DAOs
 */
export function useDAOCount() {
  const { factoryAddress, isLoading: addressLoading } = useFactoryAddress();

  const {
    data: count,
    isError,
    isLoading,
    error,
  } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'getDAOCount',
    query: {
      enabled: !!factoryAddress,
      refetchInterval: 60000, // Refetch every minute
    },
  });

  return {
    count: count ? Number(count) : 0,
    isLoading: isLoading || addressLoading,
    isError,
    error,
  };
}

/**
 * Hook for deploying a new DAO
 */
export function useDeployDAO() {
  const { factoryAddress } = useFactoryAddress();
  const chainId = useChainId();
  const { address: account } = useAccount();
  const publicClient = usePublicClient();

  const {
    writeContract,
    data: hash,
    isPending,
    isError,
    error,
    isSuccess,
  } = useWriteContract();

  const deployDAO = useMemo(() => {
    if (!factoryAddress) return undefined;
    
    return async (config: ContractDAOConfig, recipient: Address) => {
      console.info('[Factory] Calling writeContract(deployDAO)', {
        factoryAddress,
        chainId,
        account,
        recipient,
      });
      let nonce: number | undefined = undefined;
      try {
        if (account && publicClient) {
          nonce = await publicClient.getTransactionCount({ address: account as any, blockTag: 'pending' });
          console.info('[Factory] Using on-chain pending nonce', { nonce });
        }
      } catch (e) {
        console.warn('[Factory] Failed to fetch pending nonce, letting wallet set it');
      }
      writeContract({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'deployDAO',
        args: [config, recipient],
        gas: GAS_LIMITS.DEPLOY_DAO,
        chainId,
        account,
        nonce,
      } as any);
    };
  }, [factoryAddress, writeContract, chainId, account, publicClient]);

  return {
    deployDAO,
    hash,
    isPending,
    isError,
    error,
    isSuccess,
    isSupported: !!factoryAddress,
  };
}

/**
 * Hook for watching DAO deployment events
 */
export function useWatchDAODeployments(onDAODeployed?: (event: any) => void) {
  const { factoryAddress } = useFactoryAddress();

  useWatchContractEvent({
    address: factoryAddress,
    abi: FACTORY_ABI,
    eventName: 'DAODeployed',
    onLogs: (logs) => {
      logs.forEach((log) => {
        if (onDAODeployed) {
          onDAODeployed(log.args);
        }
      });
    },
    enabled: !!factoryAddress,
  });
}

/**
 * Combined factory hook with all functionality
 */
export function useFactory() {
  const { daos: allDAOs, isLoading: loadingAllDAOs, refetch: refetchAllDAOs } = useAllDAOs();
  const { count: totalCount, isLoading: loadingCount } = useDAOCount();
  const { 
    deployDAO, 
    hash: deployHash, 
    isPending: isDeploying, 
    isError: deployError, 
    error: deployErrorDetails,
    isSuccess: deploySuccess,
    isSupported 
  } = useDeployDAO();

  // Watch for new deployments and refetch data when they occur
  useWatchDAODeployments((event) => {
    console.log('New DAO deployed:', event);
    // Refetch data when a new DAO is deployed
    setTimeout(() => {
      refetchAllDAOs();
    }, 1000); // Small delay to ensure blockchain state is updated
  });

  return {
    // Data
    allDAOs,
    totalCount,
    
    // Loading states
    isLoading: loadingAllDAOs || loadingCount,
    
    // Actions
    deployDAO,
    refetchAllDAOs,
    
    // Deployment state
    deployHash,
    isDeploying,
    deployError,
    deployErrorDetails,
    deploySuccess,
    
    // Chain support
    isSupported,
  };
}

/**
 * Hook for factory contract stats and analytics
 */
export function useFactoryStats() {
  const { count: totalCount } = useDAOCount();
  const { daos: allDAOs, isLoading } = useAllDAOs();

  const stats = useMemo(() => {
    if (!allDAOs.length) {
      return {
        totalDAOs: 0,
        recentDeployments: [],
        topDeployers: [],
        deploymentTrend: [],
      };
    }

    // Get recent deployments (last 7 days)
    const weekAgo = BigInt(Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60);
    const recentDeployments = allDAOs.filter(dao => dao.timestamp > weekAgo);

    // Get top deployers
    const deployerCounts = allDAOs.reduce((acc, dao) => {
      acc[dao.deployer] = (acc[dao.deployer] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topDeployers = Object.entries(deployerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([address, count]) => ({ address, count }));

    // Calculate deployment trend (last 30 days, by week)
    const monthAgo = BigInt(Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60);
    const monthlyDeployments = allDAOs.filter(dao => dao.timestamp > monthAgo);
    
    const deploymentTrend = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = BigInt(Math.floor(Date.now() / 1000) - (i + 1) * 7 * 24 * 60 * 60);
      const weekEnd = BigInt(Math.floor(Date.now() / 1000) - i * 7 * 24 * 60 * 60);
      const weekDeployments = monthlyDeployments.filter(
        dao => dao.timestamp >= weekStart && dao.timestamp < weekEnd
      );
      
      deploymentTrend.push({
        week: `Week ${4 - i}`,
        count: weekDeployments.length,
        timestamp: Number(weekStart),
      });
    }

    return {
      totalDAOs: totalCount,
      recentDeployments: recentDeployments.length,
      topDeployers,
      deploymentTrend,
    };
  }, [allDAOs, totalCount]);

  return {
    stats,
    isLoading,
  };
}