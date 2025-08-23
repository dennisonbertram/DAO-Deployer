'use client'

import { DAOConfig, ValidationError, GOVERNANCE_PRESETS, PresetId, SUPPORTED_NETWORKS } from '@/types/deploy';
import { validateGovernanceParams, formatTime, formatTimeFromSeconds } from '@/lib/validation/deploy';
import FormField from '@/components/deploy/FormField';
import { useState, useEffect } from 'react';

interface GovernanceParamsProps {
  config: Partial<DAOConfig>;
  onUpdate: (updates: Partial<DAOConfig>) => void;
  onValidation: (errors: ValidationError[]) => void;
}

export default function GovernanceParams({ config, onUpdate, onValidation }: GovernanceParamsProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<PresetId | 'custom'>('custom');

  const currentNetwork = SUPPORTED_NETWORKS.find(n => n.id === config.network) || SUPPORTED_NETWORKS[0];
  const blockTime = currentNetwork.blockTime;

  useEffect(() => {
    const newErrors = validateGovernanceParams(config);
    setErrors(newErrors);
    onValidation(newErrors);
  }, [config, onValidation]);

  const getError = (field: keyof DAOConfig) => {
    return errors.find(error => error.field === field)?.message;
  };

  const handleInputChange = (field: keyof DAOConfig, value: string | number) => {
    onUpdate({ [field]: value });
    if (selectedPreset !== 'custom') {
      setSelectedPreset('custom');
    }
  };

  const handlePresetChange = (presetId: PresetId | 'custom') => {
    setSelectedPreset(presetId);
    if (presetId !== 'custom') {
      const preset = GOVERNANCE_PRESETS[presetId];
      onUpdate({
        votingDelay: preset.votingDelay,
        votingPeriod: preset.votingPeriod,
        proposalThreshold: preset.proposalThreshold,
        quorumPercentage: preset.quorumPercentage,
        timelockDelay: preset.timelockDelay,
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Governance Parameters</h3>
        <p className="text-gray-600">
          Configure how your DAO makes decisions. These parameters control proposal timing, voting requirements, and execution delays.
        </p>
      </div>

      {/* Preset Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Choose a Governance Preset
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(GOVERNANCE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => handlePresetChange(key as PresetId)}
              className={`p-4 border rounded-lg text-left transition-all ${
                selectedPreset === key
                  ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h4 className="font-medium text-gray-900 mb-1">{preset.name}</h4>
              <p className="text-sm text-gray-600">{preset.description}</p>
            </button>
          ))}
        </div>
        
        <button
          type="button"
          onClick={() => handlePresetChange('custom')}
          className={`w-full p-3 border rounded-lg text-left transition-all ${
            selectedPreset === 'custom'
              ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center">
            <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            <span className="font-medium">Custom Configuration</span>
          </div>
        </button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Voting Delay"
            description="Time before voting starts after proposal creation"
            error={getError('votingDelay')}
            required
            tooltip="Gives community time to review proposals before voting begins"
          >
            <div className="relative">
              <input
                type="number"
                className={`input ${getError('votingDelay') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                placeholder="1800"
                value={config.votingDelay ?? ''}
                onChange={(e) => handleInputChange('votingDelay', parseInt(e.target.value) || 0)}
                min="0"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm">
                blocks
              </div>
            </div>
            {typeof config.votingDelay === 'number' && (
              <div className="text-xs text-gray-600 mt-1">
                {formatTime(config.votingDelay, blockTime)}
              </div>
            )}
          </FormField>

          <FormField
            label="Voting Period"
            description="How long voting remains open"
            error={getError('votingPeriod')}
            required
            tooltip="Duration for community members to cast their votes"
          >
            <div className="relative">
              <input
                type="number"
                className={`input ${getError('votingPeriod') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                placeholder="25200"
                value={config.votingPeriod ?? ''}
                onChange={(e) => handleInputChange('votingPeriod', parseInt(e.target.value) || 0)}
                min="1"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm">
                blocks
              </div>
            </div>
            {typeof config.votingPeriod === 'number' && (
              <div className="text-xs text-gray-600 mt-1">
                {formatTime(config.votingPeriod, blockTime)}
              </div>
            )}
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Proposal Threshold"
            description="Minimum tokens needed to create proposals"
            error={getError('proposalThreshold')}
            required
            tooltip="Prevents spam by requiring proposers to hold tokens"
          >
            <div className="relative">
              <input
                type="number"
                className={`input ${getError('proposalThreshold') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                placeholder="1000"
                value={config.proposalThreshold || ''}
                onChange={(e) => handleInputChange('proposalThreshold', e.target.value)}
                min="0"
                step="any"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm">
                tokens
              </div>
            </div>
            {config.proposalThreshold && config.initialSupply && (
              <div className="text-xs text-gray-600 mt-1">
                {((parseFloat(config.proposalThreshold) / parseFloat(config.initialSupply)) * 100).toFixed(2)}% of total supply
              </div>
            )}
          </FormField>

          <FormField
            label="Quorum Percentage"
            description="Minimum voter participation required"
            error={getError('quorumPercentage')}
            required
            tooltip="Percentage of total supply that must participate for proposal to be valid"
          >
            <div className="relative">
              <input
                type="number"
                className={`input ${getError('quorumPercentage') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                placeholder="10"
                value={config.quorumPercentage ?? ''}
                onChange={(e) => handleInputChange('quorumPercentage', parseFloat(e.target.value) || 0)}
                min="0.1"
                max="100"
                step="0.1"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm">
                %
              </div>
            </div>
            {config.quorumPercentage && config.initialSupply && (
              <div className="text-xs text-gray-600 mt-1">
                {((parseFloat(config.initialSupply) * config.quorumPercentage) / 100).toLocaleString()} tokens minimum
              </div>
            )}
          </FormField>
        </div>

        <FormField
          label="Timelock Delay"
          description="Delay before approved proposals can be executed"
          error={getError('timelockDelay')}
          required
          tooltip="Security feature that allows time to respond to malicious proposals"
        >
          <div className="relative">
            <input
              type="number"
              className={`input ${getError('timelockDelay') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
              placeholder="86400"
              value={config.timelockDelay ?? ''}
              onChange={(e) => handleInputChange('timelockDelay', parseInt(e.target.value) || 0)}
              min="0"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm">
              seconds
            </div>
          </div>
          {typeof config.timelockDelay === 'number' && (
            <div className="text-xs text-gray-600 mt-1">
              {formatTimeFromSeconds(config.timelockDelay)}
            </div>
          )}
        </FormField>

        {/* Governance Scenario Preview */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Governance Scenario Preview</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">1. Proposal Created</span>
              <span className="font-medium">Day 0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">2. Voting Begins</span>
              <span className="font-medium">
                Day {config.votingDelay ? (config.votingDelay * blockTime / 86400).toFixed(1) : '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">3. Voting Ends</span>
              <span className="font-medium">
                Day {(config.votingDelay && config.votingPeriod) 
                  ? ((config.votingDelay + config.votingPeriod) * blockTime / 86400).toFixed(1) 
                  : '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">4. Execution Available</span>
              <span className="font-medium">
                Day {(config.votingDelay && config.votingPeriod && config.timelockDelay) 
                  ? (((config.votingDelay + config.votingPeriod) * blockTime + config.timelockDelay) / 86400).toFixed(1)
                  : '0'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-amber-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-amber-800 mb-1">Governance Considerations</h4>
              <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                <li>Lower thresholds increase participation but may allow spam proposals</li>
                <li>Higher quorum requirements ensure legitimacy but may prevent action</li>
                <li>Longer delays provide security but slow down governance</li>
                <li>These parameters can be changed later through governance proposals</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}