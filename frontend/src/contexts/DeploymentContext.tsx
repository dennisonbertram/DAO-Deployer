'use client'

import { createContext, useContext, ReactNode, useMemo, useState, useCallback, useEffect } from 'react';
import { Hash } from 'viem';
import { Address } from 'viem';
import { DAOConfig, GasEstimate, DeploymentStatus } from '@/types/deploy';
import { useFactory } from '@/hooks/contracts';

/**
 * Type definition for the deployment context
 */
interface DeploymentContextType {
  // Configuration state
  config: Partial<DAOConfig>;
  updateConfig: (updates: Partial<DAOConfig>) => void;

  // Deployment state from factory hook
  deployDAO: ((config: any, recipient: Address) => void) | undefined;
  deployHash: Hash | undefined;
  isDeploying: boolean;
  deploySuccess: boolean;
  deployError: boolean;
  deployErrorDetails: unknown;
  isSupported: boolean;

  // Local deployment state
  deploymentStatus: DeploymentStatus;
  setDeploymentStatus: (status: DeploymentStatus) => void;

  // Gas estimation (currently mock data)
  gasEstimate: GasEstimate;

  // Modal state
  showDeploymentModal: boolean;
  setShowDeploymentModal: (show: boolean) => void;
  deploymentHash: Hash | undefined;
  setDeploymentHash: (hash: Hash | undefined) => void;
}

/**
 * Create the context with undefined as default
 */
const DeploymentContext = createContext<DeploymentContextType | undefined>(undefined);

/**
 * Custom hook to use the deployment context
 * Throws an error if used outside of DeploymentProvider
 */
export function useDeployment(): DeploymentContextType {
  const context = useContext(DeploymentContext);
  if (context === undefined) {
    throw new Error('useDeployment must be used within a DeploymentProvider');
  }
  return context;
}

/**
 * Props for the DeploymentProvider component
 */
interface DeploymentProviderProps {
  children: ReactNode;
  initialConfig: Partial<DAOConfig>;
}

/**
 * Provider component that wraps the deployment wizard
 * Manages all deployment-related state and provides it via context
 */
export function DeploymentProvider({ children, initialConfig }: DeploymentProviderProps) {
  // Local state
  const [config, setConfig] = useState<Partial<DAOConfig>>(initialConfig);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>({ status: 'idle' });
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [deploymentHash, setDeploymentHash] = useState<Hash | undefined>();

  // Get deployment state from factory hooks
  const {
    deployDAO,
    deployHash,
    isDeploying,
    deploySuccess,
    deployError,
    deployErrorDetails,
    isSupported
  } = useFactory();

  // Mock gas estimate - in real implementation, this would come from Web3
  const gasEstimate: GasEstimate = useMemo(() => ({
    gasLimit: '2500000',
    gasPrice: '20',
    totalCost: '0.05',
    totalCostUSD: '150.00'
  }), []);

  // Update config callback
  const updateConfig = useCallback((updates: Partial<DAOConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Open modal only after wallet confirmation (when a tx hash exists)
  useEffect(() => {
    if (deployHash) {
      console.info('[DeploymentContext] Received deploy hash, opening modal', { deployHash });
      if (!showDeploymentModal) setShowDeploymentModal(true);
      setDeploymentHash(deployHash as Hash);
      setDeploymentStatus({ status: 'deploying', transactionHash: deployHash });
    }
  }, [deployHash, showDeploymentModal]);

  // Log isDeploying / error transitions
  useEffect(() => {
    if (isDeploying) {
      console.info('[DeploymentContext] isDeploying true');
    }
  }, [isDeploying]);

  useEffect(() => {
    if (deployError) {
      console.error('[DeploymentContext] deployError', deployErrorDetails);
    }
  }, [deployError, deployErrorDetails]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<DeploymentContextType>(() => ({
    config,
    updateConfig,
    deployDAO,
    deployHash,
    isDeploying,
    deploySuccess,
    deployError,
    deployErrorDetails,
    isSupported,
    deploymentStatus,
    setDeploymentStatus,
    gasEstimate,
    showDeploymentModal,
    setShowDeploymentModal,
    deploymentHash,
    setDeploymentHash,
  }), [
    config,
    updateConfig,
    deployDAO,
    deployHash,
    isDeploying,
    deploySuccess,
    deployError,
    deployErrorDetails,
    isSupported,
    deploymentStatus,
    gasEstimate,
    showDeploymentModal,
    deploymentHash,
  ]);

  return (
    <DeploymentContext.Provider value={value}>
      {children}
    </DeploymentContext.Provider>
  );
}
