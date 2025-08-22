'use client'

import { DAOConfig, ValidationError, SUPPORTED_NETWORKS, NetworkId } from '@/types/deploy';
import { validateAdvancedSettings } from '@/lib/validation/deploy';
import FormField from '@/components/deploy/FormField';
import { useState, useEffect } from 'react';

interface AdvancedSettingsProps {
  config: Partial<DAOConfig>;
  onUpdate: (updates: Partial<DAOConfig>) => void;
  onValidation: (errors: ValidationError[]) => void;
}

export default function AdvancedSettings({ config, onUpdate, onValidation }: AdvancedSettingsProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  useEffect(() => {
    const newErrors = validateAdvancedSettings(config);
    setErrors(newErrors);
    onValidation(newErrors);
  }, [config, onValidation]);

  const getError = (field: keyof DAOConfig) => {
    return errors.find(error => error.field === field)?.message;
  };

  const handleInputChange = (field: keyof DAOConfig, value: string | boolean) => {
    onUpdate({ [field]: value });
  };

  const selectedNetwork = SUPPORTED_NETWORKS.find(n => n.id === config.network);

  // Check if we're in development environment
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       typeof window !== 'undefined' && 
                       (window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1');

  // Filter networks based on environment
  const availableNetworks = SUPPORTED_NETWORKS.filter(network => {
    // If it's a development-only network, only show in development
    if (network.developmentOnly) {
      return isDevelopment;
    }
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Advanced Settings</h3>
        <p className="text-gray-600">
          Configure network preferences, gas optimization, and optional features for your DAO.
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
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="network"
                  value={network.id}
                  checked={config.network === network.id}
                  onChange={(e) => handleInputChange('network', e.target.value)}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-gray-900">{network.name}</h4>
                    <span className="text-xs text-gray-500">{network.currency}</span>
                  </div>
                  <div className="text-xs text-gray-600 space-x-4">
                    <span>Chain ID: {network.chainId}</span>
                    <span>~{network.blockTime}s blocks</span>
                  </div>
                </div>
                {config.network === network.id && (
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </label>
            ))}
          </div>
        </FormField>

        {/* Gas Optimization */}
        <FormField
          label="Gas Optimization"
          description="Choose how to optimize gas fees for deployment"
          tooltip="Higher gas prices result in faster transaction confirmation"
        >
          <div className="space-y-3">
            {[
              { id: 'standard', name: 'Standard', description: 'Balanced speed and cost (~30-60 seconds)' },
              { id: 'fast', name: 'Fast', description: 'Higher cost for faster confirmation (~15-30 seconds)' },
              { id: 'custom', name: 'Custom', description: 'Set your own gas price' },
            ].map((option) => (
              <label
                key={option.id}
                className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                  config.gasOptimization === option.id
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="gasOptimization"
                  value={option.id}
                  checked={config.gasOptimization === option.id}
                  onChange={(e) => handleInputChange('gasOptimization', e.target.value as any)}
                  className="mt-1"
                />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900">{option.name}</h4>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
              </label>
            ))}

            {config.gasOptimization === 'custom' && (
              <FormField
                label="Custom Gas Price"
                description="Enter your preferred gas price in Gwei"
                error={getError('customGasPrice')}
                required
              >
                <div className="relative">
                  <input
                    type="number"
                    className={`input ${getError('customGasPrice') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                    placeholder="20"
                    value={config.customGasPrice || ''}
                    onChange={(e) => handleInputChange('customGasPrice', e.target.value)}
                    min="1"
                    step="0.1"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm">
                    Gwei
                  </div>
                </div>
              </FormField>
            )}
          </div>
        </FormField>

        {/* Additional Features */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Additional Features
          </label>
          <div className="space-y-4">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={config.enableGaslessVoting || false}
                onChange={(e) => handleInputChange('enableGaslessVoting', e.target.checked)}
                className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Enable Gasless Voting</h4>
                <p className="text-sm text-gray-600">Allow users to vote without paying gas fees using meta-transactions</p>
              </div>
            </label>

            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={config.enableTokenBurning || false}
                onChange={(e) => handleInputChange('enableTokenBurning', e.target.checked)}
                className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Include Token Burning Capability</h4>
                <p className="text-sm text-gray-600">Allow token holders to permanently remove tokens from circulation</p>
              </div>
            </label>

            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={config.enableTreasuryDiversification || false}
                onChange={(e) => handleInputChange('enableTreasuryDiversification', e.target.checked)}
                className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Add Treasury Diversification Tools</h4>
                <p className="text-sm text-gray-600">Include advanced treasury management capabilities for asset diversification</p>
              </div>
            </label>
          </div>
        </div>

        {/* Network Information Card */}
        {selectedNetwork && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  Deploying to {selectedNetwork.name}
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-amber-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-amber-800 mb-1">Security Considerations</h4>
              <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                <li>Additional features increase contract complexity and gas costs</li>
                <li>Test thoroughly on testnets before mainnet deployment</li>
                <li>Consider starting with basic features and upgrading later</li>
                <li>Gasless voting requires additional infrastructure setup</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}