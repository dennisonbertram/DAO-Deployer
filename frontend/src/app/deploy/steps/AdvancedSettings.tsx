'use client'

import { DAOConfig, ValidationError, SUPPORTED_NETWORKS } from '@/types/deploy';
import { validateAdvancedSettings } from '@/lib/validation/deploy';
import FormField from '@/components/deploy/FormField';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';

interface AdvancedSettingsProps {
  config: Partial<DAOConfig>;
  onUpdate: (updates: Partial<DAOConfig>) => void;
  onValidation: (errors: ValidationError[]) => void;
}

function AdvancedSettings({ config, onUpdate, onValidation }: AdvancedSettingsProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  // Memoize validation results
  const validationErrors = useMemo(() => {
    return validateAdvancedSettings(config);
  }, [config]);

  useEffect(() => {
    setErrors(validationErrors);
    onValidation(validationErrors);
  }, [validationErrors, onValidation]);

  const getError = useCallback((field: keyof DAOConfig) => {
    return errors.find(error => error.field === field)?.message;
  }, [errors]);

  const selectedNetwork = useMemo(() =>
    SUPPORTED_NETWORKS.find(n => n.id === config.network),
    [config.network]
  );

  // Memoize development environment check
  const isDevelopment = useMemo(() =>
    process.env.NODE_ENV === 'development' ||
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1'),
    []
  );

  // Memoize available networks based on environment
  const availableNetworks = useMemo(() =>
    SUPPORTED_NETWORKS.filter(network => {
      // If it's a development-only network, only show in development
      if (network.developmentOnly) {
        return isDevelopment;
      }
      return true;
    }),
    [isDevelopment]
  );

  const handleNetworkSelect = useCallback((networkId: string) => {
    onUpdate({ network: networkId });
    const target = SUPPORTED_NETWORKS.find(n => n.id === networkId);
    if (!target) return;
    if (!isConnected || !switchChain) return;
    if (walletChainId === target.chainId) return;
    switchChain({ chainId: target.chainId });
  }, [isConnected, onUpdate, switchChain, walletChainId]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-foreground mb-4">Advanced Settings</h3>
        <p className="text-muted-foreground">
          Choose the network where you will deploy. Your wallet will be asked to switch networks.
        </p>
      </div>

      <div className="space-y-8">
        {/* Network Selection */}
        <FormField
          label="Deployment Network"
          description="Choose the blockchain network where your DAO will be deployed"
          error={getError('network')}
          required
          tooltip="Your DAO will have the same address across all networks due to CREATE2 deployment"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableNetworks.map((network) => (
              <label
                key={network.id}
                className={`relative flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                  config.network === network.id
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-border hover:border-border/80'
                }`}
              >
                <input
                  type="radio"
                  name="network"
                  value={network.id}
                  checked={config.network === network.id}
                  onChange={(e) => handleNetworkSelect(e.target.value)}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-foreground">{network.name}</h4>
                    <span className="text-xs text-muted-foreground">{network.currency}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-x-4">
                    <span>Chain ID: {network.chainId}</span>
                    <span>~{network.blockTime}s blocks</span>
                  </div>
                </div>
                {config.network === network.id && (
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </label>
            ))}
          </div>
          {!isConnected && (
            <p className="text-xs text-muted-foreground mt-2">
              Connect your wallet to switch networks automatically.
            </p>
          )}
          {isSwitchingChain && (
            <p className="text-xs text-muted-foreground mt-2">
              Switching network in your wallet…
            </p>
          )}
        </FormField>

        {/* Network Information Card */}
        {selectedNetwork && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-primary mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Deploying to {selectedNetwork.name}
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Chain ID: {selectedNetwork.chainId}</li>
                  <li>• Block time: ~{selectedNetwork.blockTime} seconds</li>
                  <li>• Currency: {selectedNetwork.currency}</li>
                  <li>• Your DAO will have the same address on all supported networks</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="bg-tally-orange-1 border border-tally-orange-3 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-tally-orange-7 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-tally-orange-9 mb-1">Security Considerations</h4>
              <ul className="text-sm text-tally-orange-8 space-y-1 list-disc list-inside">
                <li>Test thoroughly on testnets before mainnet deployment</li>
                <li>Consider starting with basic features and upgrading later</li>
                <li>Always verify network and parameters before signing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap component in React.memo to prevent unnecessary re-renders
export default memo(AdvancedSettings);
