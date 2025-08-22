'use client'

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Hash } from 'viem';
import { DAOConfig, ValidationError, DeploymentStep, DeploymentStatus, GasEstimate } from '@/types/deploy';
import ProgressBar from '@/components/deploy/ProgressBar';
import BasicInfo from './steps/BasicInfo';
import GovernanceParams from './steps/GovernanceParams';
import AdvancedSettings from './steps/AdvancedSettings';
import ReviewDeploy from './steps/ReviewDeploy';
import DeploymentModal from '@/components/deploy/DeploymentModal';
import { useFactory } from '@/hooks/contracts';

const INITIAL_CONFIG: Partial<DAOConfig> = {
  name: '',
  description: '',
  tokenName: '',
  tokenSymbol: '',
  initialSupply: '',
  initialRecipient: '',
  votingDelay: 1800, // ~6 hours on Ethereum
  votingPeriod: 25200, // ~3.5 days on Ethereum  
  proposalThreshold: '1000',
  quorumPercentage: 10,
  timelockDelay: 86400, // 1 day
  network: 'ethereum',
  gasOptimization: 'standard',
  enableGaslessVoting: false,
  enableTokenBurning: false,
  enableTreasuryDiversification: false,
};

export default function DeployPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<Partial<DAOConfig>>(INITIAL_CONFIG);
  const [stepErrors, setStepErrors] = useState<Record<number, ValidationError[]>>({});
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

  // Watch for deployment start and show modal
  useEffect(() => {
    if (isDeploying && !showDeploymentModal) {
      setShowDeploymentModal(true);
      setDeploymentStatus({ status: 'preparing' });
    }
  }, [isDeploying, showDeploymentModal]);

  // Update deployment hash when factory provides it
  useEffect(() => {
    if (deployHash && showDeploymentModal) {
      setDeploymentHash(deployHash as Hash);
      setDeploymentStatus({ 
        status: 'deploying', 
        transactionHash: deployHash 
      });
    }
  }, [deployHash, showDeploymentModal]);
  
  // Mock gas estimate - in real implementation, this would come from Web3
  const gasEstimate: GasEstimate = {
    gasLimit: '2500000',
    gasPrice: '20',
    totalCost: '0.05',
    totalCostUSD: '150.00'
  };

  const steps: DeploymentStep[] = useMemo(() => [
    {
      id: 1,
      title: 'Basic Information',
      description: 'DAO name, token details, and initial configuration',
      isComplete: currentStep > 1 && (stepErrors[1]?.length === 0),
      isActive: currentStep === 1,
    },
    {
      id: 2,
      title: 'Governance Parameters',
      description: 'Voting delays, thresholds, and decision-making rules',
      isComplete: currentStep > 2 && (stepErrors[2]?.length === 0),
      isActive: currentStep === 2,
    },
    {
      id: 3,
      title: 'Advanced Settings',
      description: 'Network selection, gas optimization, and optional features',
      isComplete: currentStep > 3 && (stepErrors[3]?.length === 0),
      isActive: currentStep === 3,
    },
    {
      id: 4,
      title: 'Review & Deploy',
      description: 'Final review and deployment execution',
      isComplete: deploymentStatus.status === 'success',
      isActive: currentStep === 4,
    },
  ], [currentStep, stepErrors, deploymentStatus.status]);

  const updateConfig = useCallback((updates: Partial<DAOConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleStepValidation = useCallback((step: number, errors: ValidationError[]) => {
    setStepErrors(prev => ({ ...prev, [step]: errors }));
  }, []);

  const canProceed = (step: number) => {
    return stepErrors[step]?.length === 0;
  };

  const handleNextStep = () => {
    if (currentStep < 4 && canProceed(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleDeploy = useCallback(() => {
    // This is now just a placeholder - the modal will show automatically when isDeploying becomes true
    console.log('Deploy triggered - modal will show when isDeploying becomes true');
  }, []);

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfo
            config={config}
            onUpdate={updateConfig}
            onValidation={(errors) => handleStepValidation(1, errors)}
          />
        );
      case 2:
        return (
          <GovernanceParams
            config={config}
            onUpdate={updateConfig}
            onValidation={(errors) => handleStepValidation(2, errors)}
          />
        );
      case 3:
        return (
          <AdvancedSettings
            config={config}
            onUpdate={updateConfig}
            onValidation={(errors) => handleStepValidation(3, errors)}
          />
        );
      case 4:
        return (
          <ReviewDeploy
            config={config as DAOConfig}
            onValidation={(errors) => handleStepValidation(4, errors)}
            onDeploy={handleDeploy}
            gasEstimate={gasEstimate}
            deploymentStatus={deploymentStatus}
            deployDAO={deployDAO}
            isSupported={isSupported}
            isDeploying={isDeploying}
            deployError={deployError}
            deployErrorDetails={deployErrorDetails}
          />
        );
      default:
        return null;
    }
  };

  // Success page after deployment
  if (deploymentStatus.status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">DAO Deployed Successfully!</h1>
            <p className="text-lg text-gray-600 mb-8">
              Your {config.name} DAO has been deployed and is ready for governance.
            </p>

            {deploymentStatus.deployedAddresses && (
              <div className="bg-white border rounded-lg p-6 mb-8 text-left max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold mb-4">Deployed Contracts</h3>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Token:</span>
                    <span className="text-gray-900">{deploymentStatus.deployedAddresses.token}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Governor:</span>
                    <span className="text-gray-900">{deploymentStatus.deployedAddresses.governor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timelock:</span>
                    <span className="text-gray-900">{deploymentStatus.deployedAddresses.timelock}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary px-8 py-3">
                View DAO Dashboard
              </button>
              <button className="btn-outline px-8 py-3">
                Share with Community
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Deploy Your DAO</h1>
          <p className="text-xl text-gray-600">
            Configure and deploy your sovereign DAO in just a few steps
          </p>
        </div>

        <ProgressBar steps={steps} currentStep={currentStep} />

        <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
          {renderCurrentStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className={`btn px-8 py-3 ${
              currentStep === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'btn-outline'
            }`}
          >
            ← Previous Step
          </button>

          {currentStep < 4 && (
            <button
              onClick={handleNextStep}
              disabled={!canProceed(currentStep)}
              className={`btn px-8 py-3 ${
                canProceed(currentStep)
                  ? 'btn-primary'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Next Step →
            </button>
          )}
        </div>

        {/* Deployment Modal */}
        <DeploymentModal
          isOpen={showDeploymentModal}
          transactionHash={deploymentHash}
          config={config as DAOConfig}
          onClose={() => {
            setShowDeploymentModal(false);
            setDeploymentHash(undefined);
          }}
          onComplete={(deploymentData) => {
            // Update deployment status with successful completion
            setDeploymentStatus({
              status: 'success',
              transactionHash: deploymentData.transactionHash,
              deployedAddresses: deploymentData.deployedAddresses
            });
          }}
        />
      </div>
    </div>
  );
}