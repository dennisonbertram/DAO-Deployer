'use client'

import { DAOConfig, ValidationError } from '@/types/deploy';
import { validateBasicInfo } from '@/lib/validation/deploy';
import FormField from '@/components/deploy/FormField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';

interface BasicInfoProps {
  config: Partial<DAOConfig>;
  onUpdate: (updates: Partial<DAOConfig>) => void;
  onValidation: (errors: ValidationError[]) => void;
}

function BasicInfo({ config, onUpdate, onValidation }: BasicInfoProps) {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  // Memoize validation results to prevent unnecessary recalculations
  const validationErrors = useMemo(() => {
    return validateBasicInfo(config);
  }, [config]);

  useEffect(() => {
    setErrors(validationErrors);
    onValidation(validationErrors);
  }, [validationErrors, onValidation]);

  const getError = useCallback((field: keyof DAOConfig) => {
    return errors.find(error => error.field === field)?.message;
  }, [errors]);

  const handleInputChange = useCallback((field: keyof DAOConfig, value: string) => {
    onUpdate({ [field]: value });
  }, [onUpdate]);

  // Test data for development - wrapped in useCallback to prevent re-creation
  const fillTestData = useCallback(() => {
    onUpdate({
      description: 'A test DAO for development and testing purposes. This DAO demonstrates governance functionality and token-based voting.',
      tokenName: 'Test DAO',
      tokenSymbol: 'TEST',
      initialSupply: '1000000',
      initialRecipient: '0x742d35Cc6473D1C7Cac5BBcEf5bC8c8E4523ABcD', // Sample test address
      network: 'localhost' // Set localhost network for development testing
    });
  }, [onUpdate]);

  // Check if we're in development environment
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       typeof window !== 'undefined' && 
                       (window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-foreground">Basic Information</h3>
          {isDevelopment && (
            <button
              onClick={fillTestData}
              className="px-3 py-1.5 text-xs bg-orange-100 text-orange-800 border border-orange-200 rounded-md hover:bg-orange-200 transition-colors"
              type="button"
            >
              Fill Test Data
            </button>
          )}
        </div>
        <p className="text-muted-foreground">
          Set up the fundamental details for your DAO, including name, description, and token configuration.
        </p>
      </div>

      <div className="space-y-6">
        <FormField
          label="DAO Name"
          description="This name is stored on-chain and shown when browsing deployed DAOs"
          error={getError('tokenName')}
          required
          tooltip="This value is stored in the factory deployment event and cannot be changed after deployment"
        >
          <Input
            placeholder="e.g., Awesome Community DAO"
            value={config.tokenName || ''}
            onChange={(e) => handleInputChange('tokenName', e.target.value)}
            maxLength={50}
          />
          <div className="text-xs text-muted-foreground mt-1">
            {config.tokenName?.length || 0}/50 characters
          </div>
        </FormField>

        <FormField
          label="Description"
          description="Provide a brief description of your DAO's mission and goals (optional)"
          error={getError('description')}
          tooltip="This helps potential members understand what your DAO is about"
        >
          <Textarea
            className="min-h-[100px] resize-none"
            placeholder="Describe your DAO's purpose, goals, and community..."
            value={config.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            maxLength={500}
            rows={4}
          />
          <div className="text-xs text-muted-foreground mt-1">
            {config.description?.length || 0}/500 characters
          </div>
        </FormField>

        <div className="grid grid-cols-1 gap-6">
          <FormField
            label="Token Symbol"
            description="A short abbreviation for your token"
            error={getError('tokenSymbol')}
            required
            tooltip="Typically 2-5 uppercase letters, like ETH or USDC"
          >
            <Input
              className="uppercase"
              placeholder="e.g., ADT"
              value={config.tokenSymbol || ''}
              onChange={(e) => handleInputChange('tokenSymbol', e.target.value.toUpperCase())}
              maxLength={6}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Initial Supply"
            description="Total number of tokens to mint at launch"
            error={getError('initialSupply')}
            required
            tooltip="This determines the total voting power. Can be any positive number."
          >
            <div className="relative">
              <Input
                type="number"
                className="pr-16"
                placeholder="1000000"
                value={config.initialSupply || ''}
                onChange={(e) => handleInputChange('initialSupply', e.target.value)}
                min="0"
                step="any"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
                tokens
              </div>
            </div>
          </FormField>

          <FormField
            label="Initial Recipient"
            description="Address that will receive all initial tokens"
            error={getError('initialRecipient')}
            required
            tooltip="This address will have full voting power initially. Usually the deployer's address."
          >
            <Input
              className="font-mono text-sm"
              placeholder="0x1234...5678"
              value={config.initialRecipient || ''}
              onChange={(e) => handleInputChange('initialRecipient', e.target.value)}
            />
          </FormField>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-primary mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-foreground mb-1">Important Notes</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>DAO name and token symbol cannot be changed after deployment</li>
                <li>The initial recipient will have full voting power until tokens are distributed</li>
                <li>Consider distributing tokens to multiple addresses for better decentralization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap component in React.memo to prevent unnecessary re-renders
export default memo(BasicInfo);
