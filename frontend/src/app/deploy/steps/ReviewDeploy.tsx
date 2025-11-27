'use client'

import { DAOConfig, ValidationError, SUPPORTED_NETWORKS } from '@/types/deploy';
import { validateComplete, formatTime, formatTimeFromSeconds } from '@/lib/validation/deploy';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Address, getAddress, isAddress } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { useDeployment } from '@/contexts/DeploymentContext';

interface ReviewDeployProps {
  onValidation: (errors: ValidationError[]) => void;
  onDeploy: () => void;
}

export default function ReviewDeploy({
  onValidation,
  onDeploy,
}: ReviewDeployProps) {
  // Get all deployment state from context
  const {
    config,
    gasEstimate,
    deploymentStatus,
    deployDAO,
    isSupported,
    isDeploying,
    deployError,
    deployErrorDetails,
  } = useDeployment();
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [understandsIrreversible, setUnderstandsIrreversible] = useState(false);
  const { toast } = useToast();

  const selectedNetwork = SUPPORTED_NETWORKS.find(n => n.id === config.network);

  // Get current account
  const { address: account } = useAccount();

  useEffect(() => {
    const newErrors = validateComplete(config as DAOConfig);
    setErrors(newErrors);
    onValidation(newErrors);
  }, [config, onValidation]);

  // Show toast notification when deployment fails
  useEffect(() => {
    if (deployError && deployErrorDetails) {
      const errorMessage = deployErrorDetails instanceof Error
        ? deployErrorDetails.message
        : String(deployErrorDetails);

      // Parse common error types for user-friendly messages
      let userMessage = errorMessage;
      const lowerMsg = errorMessage.toLowerCase();

      if (lowerMsg.includes('user rejected') || lowerMsg.includes('user denied')) {
        userMessage = 'Transaction was cancelled by the user.';
      } else if (lowerMsg.includes('insufficient funds')) {
        userMessage = 'Insufficient funds to complete the deployment.';
      } else if (lowerMsg.includes('network') || lowerMsg.includes('rpc')) {
        userMessage = 'Network error. Please check your connection and try again.';
      }

      toast({
        title: 'Deployment Failed',
        description: userMessage,
        variant: 'destructive',
      } as any);
    }
  }, [deployError, deployErrorDetails, toast]);

  // Handle deployment action
  const handleDeploy = () => {
    if (!deployDAO || !account || !isSupported) {

      // Provide specific user feedback
      let errorTitle = 'Cannot Deploy DAO';
      let errorDescription = '';

      if (!account) {
        errorDescription = 'Please connect your wallet to deploy your DAO.';
      } else if (!isSupported) {
        errorDescription = 'Please switch to a supported network to deploy your DAO.';
      } else if (!deployDAO) {
        errorDescription = 'Deployment function is not available. Please refresh the page and try again.';
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      } as any);
      return;
    }

    // Validate and normalize recipient address
    if (!config.initialRecipient || !isAddress(config.initialRecipient as `0x${string}`, { strict: false })) {
      toast({
        title: 'Invalid recipient address',
        description: 'Please enter a valid Ethereum address for the initial recipient.',
        variant: 'destructive',
      } as any);
      return;
    }
    const normalizedRecipient = getAddress(config.initialRecipient as `0x${string}`);

    // Convert config to the format expected by the smart contract
    const contractConfig = {
      tokenName: config.tokenName!,
      tokenSymbol: config.tokenSymbol!,
      initialSupply: BigInt(config.initialSupply!),
      votingDelay: BigInt(config.votingDelay!),
      votingPeriod: BigInt(config.votingPeriod!),
      proposalThreshold: BigInt(config.proposalThreshold!),
      quorumPercentage: BigInt(config.quorumPercentage!),
      timelockDelay: BigInt(config.timelockDelay!),
    };

    try {
      // Start the deployment - this should trigger the wallet
      deployDAO(contractConfig, normalizedRecipient as Address);
    } catch (err) {
      // Deployment failed synchronously
    }
  };

  const canDeploy = errors.length === 0 && tosAccepted && understandsIrreversible && !isDeploying && account && isSupported;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Review & Deploy</h3>
        <p className="text-gray-600">
          Review your DAO configuration carefully before deployment. Once deployed, some settings cannot be changed.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Summary */}
        <div className="space-y-6">
          <div className="card">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">DAO Configuration</h4>
            
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-600">DAO Name</dt>
                <dd className="text-lg font-semibold text-gray-900">{config.name}</dd>
              </div>
              
              {config.description && (
                <div>
                  <dt className="text-sm font-medium text-gray-600">Description</dt>
                  <dd className="text-sm text-gray-900">{config.description}</dd>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-600">Token Name</dt>
                  <dd className="text-sm font-semibold text-gray-900">{config.tokenName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Token Symbol</dt>
                  <dd className="text-sm font-semibold text-gray-900">{config.tokenSymbol}</dd>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-600">Initial Supply</dt>
                  <dd className="text-sm font-semibold text-gray-900">
                    {config.initialSupply ? parseFloat(config.initialSupply).toLocaleString() : '0'} {config.tokenSymbol}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">Initial Recipient</dt>
                  <dd className="text-sm font-mono text-gray-900">
                    {config.initialRecipient ? `${config.initialRecipient.slice(0, 6)}...${config.initialRecipient.slice(-4)}` : 'Not set'}
                  </dd>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Governance Parameters</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Voting Delay</span>
                <span className="text-sm font-medium">
                  {config.votingDelay ?? 0} blocks ({formatTime(config.votingDelay ?? 0, selectedNetwork?.blockTime)})
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Voting Period</span>
                <span className="text-sm font-medium">
                  {config.votingPeriod ?? 0} blocks ({formatTime(config.votingPeriod ?? 0, selectedNetwork?.blockTime)})
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Proposal Threshold</span>
                <span className="text-sm font-medium">
                  {config.proposalThreshold ? parseFloat(config.proposalThreshold).toLocaleString() : '0'} {config.tokenSymbol}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Quorum</span>
                <span className="text-sm font-medium">
                  {config.quorumPercentage ?? 0}% ({config.initialSupply && config.quorumPercentage ? ((parseFloat(config.initialSupply) * config.quorumPercentage) / 100).toLocaleString() : '0'} tokens)
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Timelock Delay</span>
                <span className="text-sm font-medium">
                  {config.timelockDelay ?? 0}s ({formatTimeFromSeconds(config.timelockDelay ?? 0)})
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Network & Features</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Network</span>
                <span className="text-sm font-medium">{selectedNetwork?.name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Gas Optimization</span>
                <span className="text-sm font-medium capitalize">{config.gasOptimization}</span>
              </div>
              
              <div>
                <span className="text-sm text-gray-600 block mb-2">Additional Features</span>
                <div className="space-y-1">
                  {config.enableGaslessVoting && (
                    <div className="flex items-center text-sm text-green-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Gasless voting enabled
                    </div>
                  )}
                  {config.enableTokenBurning && (
                    <div className="flex items-center text-sm text-green-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Token burning enabled
                    </div>
                  )}
                  {config.enableTreasuryDiversification && (
                    <div className="flex items-center text-sm text-green-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Treasury diversification enabled
                    </div>
                  )}
                  {!config.enableGaslessVoting && !config.enableTokenBurning && !config.enableTreasuryDiversification && (
                    <span className="text-sm text-gray-500">No additional features selected</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deployment Section */}
        <div className="space-y-6">
          {/* Cost Breakdown */}
          {gasEstimate && (
            <div className="card">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h4>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gas Limit</span>
                  <span className="text-sm font-medium">{parseInt(gasEstimate.gasLimit).toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gas Price</span>
                  <span className="text-sm font-medium">{gasEstimate.gasPrice} Gwei</span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Total Cost</span>
                    <span className="text-lg font-bold text-gray-900">
                      {gasEstimate.totalCost} {selectedNetwork?.currency}
                    </span>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    ≈ ${gasEstimate.totalCostUSD}
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                *Gas prices are estimates and may vary based on network conditions
              </div>
            </div>
          )}

          {/* Governance Timeline Preview */}
          <div className="card">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Governance Timeline</h4>
            <p className="text-sm text-gray-600 mb-4">Example timeline for a typical proposal:</p>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">1</div>
                <div>
                  <div className="text-sm font-medium">Proposal Created</div>
                  <div className="text-xs text-gray-600">Day 0</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">2</div>
                <div>
                  <div className="text-sm font-medium">Voting Begins</div>
                  <div className="text-xs text-gray-600">
                    After {formatTime(config.votingDelay ?? 0, selectedNetwork?.blockTime)}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">3</div>
                <div>
                  <div className="text-sm font-medium">Voting Ends</div>
                  <div className="text-xs text-gray-600">
                    After {formatTime((config.votingDelay ?? 0) + (config.votingPeriod ?? 0), selectedNetwork?.blockTime)}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">4</div>
                <div>
                  <div className="text-sm font-medium">Execution Available</div>
                  <div className="text-xs text-gray-600">
                    After timelock delay ({formatTimeFromSeconds(config.timelockDelay ?? 0)})
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="card border-red-200 bg-red-50">
              <h4 className="text-lg font-semibold text-red-800 mb-4">Please Fix These Issues</h4>
              <ul className="space-y-2">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700 flex items-start">
                    <svg className="w-4 h-4 text-red-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confirmation Checkboxes */}
          <div className="space-y-4">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={understandsIrreversible}
                onChange={(e) => setUnderstandsIrreversible(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                I understand that deployment is irreversible and the DAO name, token details, and initial parameters cannot be changed after deployment.
              </span>
            </label>

            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                I agree to the{' '}
                <a href="/terms" className="text-primary-600 hover:text-primary-700 underline" target="_blank">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary-600 hover:text-primary-700 underline" target="_blank">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          </div>

          {/* Network Support Warning */}
          {!isSupported && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">Unsupported Network</h4>
                  <p className="text-sm text-yellow-700">Please switch to a supported network to deploy your DAO.</p>
                </div>
              </div>
            </div>
          )}

          {/* Account Connection Warning */}
          {!account && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-1">Wallet Not Connected</h4>
                  <p className="text-sm text-blue-700">Please connect your wallet to deploy your DAO.</p>
                </div>
              </div>
            </div>
          )}

          {/* Deploy Button */}
          <button
            onClick={handleDeploy}
            disabled={!canDeploy}
            className={`w-full btn text-lg py-4 ${
              canDeploy
                ? 'btn-primary'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isDeploying ? 'Deploying DAO...' : 'Deploy DAO'}
          </button>
        </div>
      </div>
    </div>
  );
}