'use client'

import { DAOConfig, ValidationError, SUPPORTED_NETWORKS } from '@/types/deploy';
import { validateComplete, formatTime, formatTimeFromSeconds } from '@/lib/validation/deploy';
import { useMemo, useState, useEffect } from 'react';
import { useAccount, useChainId, usePublicClient, useSwitchChain } from 'wagmi';
import { Address, formatEther, formatGwei, getAddress, isAddress, parseUnits } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { useDeployment } from '@/contexts/DeploymentContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FACTORY_ABI } from '@/lib/contracts/abis';

interface ReviewDeployProps {
  onValidation: (errors: ValidationError[]) => void;
}

export default function ReviewDeploy({
  onValidation,
}: ReviewDeployProps) {
  // Get all deployment state from context
  const {
    config,
    factoryAddress,
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
  const walletChainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();

  const selectedChainId = selectedNetwork?.chainId;
  const isWalletOnSelectedNetwork = selectedChainId ? walletChainId === selectedChainId : false;

  const normalizedRecipient = useMemo(() => {
    if (!config.initialRecipient) return null;
    if (!isAddress(config.initialRecipient as `0x${string}`, { strict: false })) return null;
    return getAddress(config.initialRecipient as `0x${string}`);
  }, [config.initialRecipient]);

  const contractConfig = useMemo(() => {
    if (
      !config.tokenName ||
      !config.tokenSymbol ||
      !config.initialSupply ||
      config.votingDelay === undefined ||
      config.votingPeriod === undefined ||
      !config.proposalThreshold ||
      config.quorumPercentage === undefined ||
      config.timelockDelay === undefined
    ) {
      return null;
    }

    try {
      return {
        tokenName: config.tokenName,
        tokenSymbol: config.tokenSymbol,
        initialSupply: parseUnits(config.initialSupply, 18),
        votingDelay: BigInt(config.votingDelay),
        votingPeriod: BigInt(config.votingPeriod),
        proposalThreshold: parseUnits(config.proposalThreshold, 18),
        quorumPercentage: BigInt(config.quorumPercentage),
        timelockDelay: BigInt(config.timelockDelay),
      };
    } catch {
      return null;
    }
  }, [
    config.initialSupply,
    config.proposalThreshold,
    config.quorumPercentage,
    config.timelockDelay,
    config.tokenName,
    config.tokenSymbol,
    config.votingDelay,
    config.votingPeriod,
  ]);

  const [feeEstimate, setFeeEstimate] = useState<{
    gas: bigint;
    gasPrice: bigint;
    maxCostWei: bigint;
  } | null>(null);
  const [feeEstimateError, setFeeEstimateError] = useState<string | null>(null);

  useEffect(() => {
    const newErrors = validateComplete(config as DAOConfig);
    setErrors(newErrors);
    onValidation(newErrors);
  }, [config, onValidation]);

  useEffect(() => {
    let cancelled = false;

    async function estimate() {
      setFeeEstimate(null);
      setFeeEstimateError(null);

      if (!publicClient) return;
      if (!factoryAddress) return;
      if (!account) return;
      if (!normalizedRecipient) return;
      if (!contractConfig) return;
      if (!isWalletOnSelectedNetwork) return;
      if (errors.length > 0) return;

      try {
        const [gas, gasPrice] = await Promise.all([
          publicClient.estimateContractGas({
            address: factoryAddress,
            abi: FACTORY_ABI,
            functionName: 'deployDAO',
            args: [contractConfig, normalizedRecipient as Address],
            account,
          }),
          publicClient.getGasPrice(),
        ]);

        if (cancelled) return;
        setFeeEstimate({ gas, gasPrice, maxCostWei: gas * gasPrice });
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Failed to estimate network fee';
        setFeeEstimateError(message);
      }
    }

    estimate();
    return () => {
      cancelled = true;
    };
  }, [account, contractConfig, errors.length, factoryAddress, isWalletOnSelectedNetwork, normalizedRecipient, publicClient]);

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
    if (!selectedNetwork || !selectedChainId) {
      toast({
        title: 'Select a network',
        description: 'Please choose a network before deploying.',
        variant: 'destructive',
      } as any);
      return;
    }

    if (!isWalletOnSelectedNetwork) {
      if (switchChain) {
        switchChain({ chainId: selectedChainId });
      }
      return;
    }

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
    if (!normalizedRecipient) {
      toast({
        title: 'Invalid recipient address',
        description: 'Please enter a valid Ethereum address for the initial recipient.',
        variant: 'destructive',
      } as any);
      return;
    }
    if (!contractConfig) {
      toast({
        title: 'Invalid configuration',
        description: 'Please review your settings and try again.',
        variant: 'destructive',
      } as any);
      return;
    }

    try {
      // Start the deployment - this should trigger the wallet
      deployDAO(contractConfig, normalizedRecipient as Address);
    } catch (err) {
      // Deployment failed synchronously
    }
  };

  const canDeploy = errors.length === 0 &&
    tosAccepted &&
    understandsIrreversible &&
    !isDeploying &&
    !isSwitchingChain &&
    !!account &&
    !!isSupported &&
    !!selectedChainId &&
    isWalletOnSelectedNetwork;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-foreground mb-4">Review & Deploy</h3>
        <p className="text-muted-foreground">
          Review your DAO configuration carefully before deployment. Once deployed, some settings cannot be changed.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>DAO Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            
              <div>
                <dt className="text-sm font-medium text-muted-foreground">DAO Name</dt>
                <dd className="text-lg font-semibold text-foreground">{config.tokenName}</dd>
              </div>
              
              {config.description && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Description</dt>
                  <dd className="text-sm text-foreground">{config.description}</dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-muted-foreground">Token Symbol</dt>
                <dd className="text-sm font-semibold text-foreground">{config.tokenSymbol}</dd>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Initial Supply</dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {config.initialSupply ? parseFloat(config.initialSupply).toLocaleString() : '0'} {config.tokenSymbol}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Initial Recipient</dt>
                  <dd className="text-sm font-mono text-foreground">
                    {config.initialRecipient ? `${config.initialRecipient.slice(0, 6)}...${config.initialRecipient.slice(-4)}` : 'Not set'}
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Governance Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
            
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Voting Delay</span>
                <span className="text-sm font-medium">
                  {config.votingDelay ?? 0} blocks ({formatTime(config.votingDelay ?? 0, selectedNetwork?.blockTime)})
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Voting Period</span>
                <span className="text-sm font-medium">
                  {config.votingPeriod ?? 0} blocks ({formatTime(config.votingPeriod ?? 0, selectedNetwork?.blockTime)})
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Proposal Threshold</span>
                <span className="text-sm font-medium">
                  {config.proposalThreshold ? parseFloat(config.proposalThreshold).toLocaleString() : '0'} {config.tokenSymbol}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Quorum</span>
                <span className="text-sm font-medium">
                  {config.quorumPercentage ?? 0}% ({config.initialSupply && config.quorumPercentage ? ((parseFloat(config.initialSupply) * config.quorumPercentage) / 100).toLocaleString() : '0'} tokens)
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Timelock Delay</span>
                <span className="text-sm font-medium">
                  {config.timelockDelay ?? 0}s ({formatTimeFromSeconds(config.timelockDelay ?? 0)})
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Network</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Network</span>
                <span className="text-sm font-medium">{selectedNetwork?.name}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deployment Section */}
        <div className="space-y-6">
          {/* Estimated Network Fee */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Estimated Network Fee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!account ? (
                <p className="text-sm text-muted-foreground">Connect your wallet to estimate fees.</p>
              ) : !isWalletOnSelectedNetwork ? (
                <p className="text-sm text-muted-foreground">Switch to {selectedNetwork?.name} to estimate fees.</p>
              ) : feeEstimate ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated gas</span>
                    <span className="font-medium">{feeEstimate.gas.toString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gas price</span>
                    <span className="font-medium">{formatGwei(feeEstimate.gasPrice)} gwei</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-foreground font-medium">Max cost</span>
                    <span className="font-semibold">
                      {formatEther(feeEstimate.maxCostWei)} {selectedNetwork?.currency}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estimates can change based on network conditions and wallet fee settings.
                  </p>
                </>
              ) : feeEstimateError ? (
                <p className="text-sm text-muted-foreground">Unable to estimate fees: {feeEstimateError}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Estimating…</p>
              )}
            </CardContent>
          </Card>

          {/* Governance Timeline Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Governance Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Example timeline for a typical proposal:</p>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium mr-3">1</div>
                <div>
                  <div className="text-sm font-medium">Proposal Created</div>
                  <div className="text-xs text-muted-foreground">Day 0</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium mr-3">2</div>
                <div>
                  <div className="text-sm font-medium">Voting Begins</div>
                  <div className="text-xs text-muted-foreground">
                    After {formatTime(config.votingDelay ?? 0, selectedNetwork?.blockTime)}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium mr-3">3</div>
                <div>
                  <div className="text-sm font-medium">Voting Ends</div>
                  <div className="text-xs text-muted-foreground">
                    After {formatTime((config.votingDelay ?? 0) + (config.votingPeriod ?? 0), selectedNetwork?.blockTime)}
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-8 h-8 bg-tally-green-2 text-tally-green-8 rounded-full flex items-center justify-center text-xs font-medium mr-3">4</div>
                <div>
                  <div className="text-sm font-medium">Execution Available</div>
                  <div className="text-xs text-muted-foreground">
                    After timelock delay ({formatTimeFromSeconds(config.timelockDelay ?? 0)})
                  </div>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-destructive">Please Fix These Issues</CardTitle>
              </CardHeader>
              <CardContent>
              <ul className="space-y-2">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-destructive flex items-start">
                    <svg className="w-4 h-4 text-destructive mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error.message}
                  </li>
                ))}
              </ul>
              </CardContent>
            </Card>
          )}

          {/* Confirmation Checkboxes */}
          <div className="space-y-4">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={understandsIrreversible}
                onChange={(e) => setUnderstandsIrreversible(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm text-foreground">
                I understand that deployment is irreversible and the DAO name, token details, and initial parameters cannot be changed after deployment.
              </span>
            </label>

            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm text-foreground">
                I agree to the{' '}
                <a href="/terms" className="text-primary underline underline-offset-4 hover:text-primary/80" target="_blank">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary underline underline-offset-4 hover:text-primary/80" target="_blank">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          </div>

          {/* Network Support Warning */}
          {!isSupported && (
            <div className="bg-tally-orange-1 border border-tally-orange-3 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-tally-orange-7 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-tally-orange-9 mb-1">Unsupported network</h4>
                  <p className="text-sm text-tally-orange-8">Please switch to a supported network to deploy your DAO.</p>
                </div>
              </div>
            </div>
          )}

          {/* Account Connection Warning */}
          {!account && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-primary mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">Wallet not connected</h4>
                  <p className="text-sm text-muted-foreground">Please connect your wallet to deploy your DAO.</p>
                </div>
              </div>
            </div>
          )}

          {/* Network Mismatch Warning */}
          {!!selectedChainId && !isWalletOnSelectedNetwork && (
            <div className="bg-tally-orange-1 border border-tally-orange-3 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-tally-orange-7 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-tally-orange-9 mb-1">Network mismatch</h4>
                  <p className="text-sm text-tally-orange-8">
                    You selected {selectedNetwork?.name}, but your wallet is connected to chain ID {walletChainId}.
                  </p>
                  {switchChain && (
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!account || isSwitchingChain}
                        onClick={() => switchChain({ chainId: selectedChainId })}
                      >
                        {isSwitchingChain ? 'Switching…' : `Switch to ${selectedNetwork?.name}`}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Deploy Button */}
          <Button
            onClick={handleDeploy}
            disabled={!canDeploy}
            className="w-full text-lg py-6 rounded-tally-button"
          >
            {isSwitchingChain ? 'Switching network…' : isDeploying ? 'Deploying DAO...' : 'Deploy DAO'}
          </Button>
        </div>
      </div>
    </div>
  );
}
