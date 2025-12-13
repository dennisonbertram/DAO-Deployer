'use client'

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DAOConfig, ValidationError, DeploymentStep } from '@/types/deploy';
import ProgressBar from '@/components/deploy/ProgressBar';
import { Button } from '@/components/ui/button';
import BasicInfo from './steps/BasicInfo';
import GovernanceParams from './steps/GovernanceParams';
import AdvancedSettings from './steps/AdvancedSettings';
import ReviewDeploy from './steps/ReviewDeploy';
import DeploymentModal from '@/components/deploy/DeploymentModal';
import { DeploymentProvider, useDeployment } from '@/contexts/DeploymentContext';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';

// Check if we're in development to set default network
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     (typeof window !== 'undefined' && 
                      (window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1'));

const INITIAL_CONFIG: Partial<DAOConfig> = {
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
  network: isDevelopment ? 'localhost' : 'ethereum', // Default to localhost in development
};

/**
 * Inner component that uses the deployment context
 * This is separated to allow the provider to wrap it
 */
function DeployPageContent() {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepErrors, setStepErrors] = useState<Record<number, ValidationError[]>>({});

  // Get all deployment state from context
  const {
    config,
    updateConfig,
    deploymentStatus,
    setDeploymentStatus,
    showDeploymentModal,
    setShowDeploymentModal,
    deploymentHash,
    setDeploymentHash,
  } = useDeployment();

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
      description: 'Network selection and wallet switching',
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

  const handleStepValidation = useCallback((step: number, errors: ValidationError[]) => {
    setStepErrors(prev => ({ ...prev, [step]: errors }));
  }, []);

  // Create stable validation callbacks for each step
  const handleStep1Validation = useCallback((errors: ValidationError[]) => {
    handleStepValidation(1, errors);
  }, [handleStepValidation]);

  const handleStep2Validation = useCallback((errors: ValidationError[]) => {
    handleStepValidation(2, errors);
  }, [handleStepValidation]);

  const handleStep3Validation = useCallback((errors: ValidationError[]) => {
    handleStepValidation(3, errors);
  }, [handleStepValidation]);

  const handleStep4Validation = useCallback((errors: ValidationError[]) => {
    handleStepValidation(4, errors);
  }, [handleStepValidation]);

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

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfo
            config={config}
            onUpdate={updateConfig}
            onValidation={handleStep1Validation}
          />
        );
      case 2:
        return (
          <GovernanceParams
            config={config}
            onUpdate={updateConfig}
            onValidation={handleStep2Validation}
          />
        );
      case 3:
        return (
          <AdvancedSettings
            config={config}
            onUpdate={updateConfig}
            onValidation={handleStep3Validation}
          />
        );
      case 4:
        return (
          <ReviewDeploy
            onValidation={handleStep4Validation}
          />
        );
      default:
        return null;
    }
  };

  // Success page after deployment
  if (deploymentStatus.status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-tally-green-2 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-tally-green-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">DAO deployed</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Your {config.tokenName} DAO has been deployed and is ready for governance.
            </p>

            {deploymentStatus.deployedAddresses && (
              <div className="bg-card border rounded-lg p-6 mb-8 text-left max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold mb-4">Deployed contracts</h3>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token</span>
                    <span className="text-foreground">{deploymentStatus.deployedAddresses.token}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Governor</span>
                    <span className="text-foreground">{deploymentStatus.deployedAddresses.governor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timelock</span>
                    <span className="text-foreground">{deploymentStatus.deployedAddresses.timelock}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="rounded-tally-button px-8 py-6" onClick={() => window.location.reload()}>
                Deploy another DAO
              </Button>
              <Button variant="secondary" className="rounded-tally-button px-8 py-6" asChild>
                <Link href="/explore">Explore deployments</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="font-brand text-4xl font-bold tracking-tight sm:text-6xl mb-tally-6">Deploy Your DAO</h1>
          <p className="text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            Configure and deploy your sovereign DAO in just a few steps
          </p>
        </div>

        <ProgressBar steps={steps} currentStep={currentStep} />

        <div className="bg-card rounded-tally-container border p-8 mb-8">
          {renderCurrentStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            variant="outline"
            className="rounded-tally-button px-8"
          >
            ← Previous Step
          </Button>

          {currentStep < 4 && (
            <Button
              onClick={handleNextStep}
              disabled={!canProceed(currentStep)}
              className="rounded-tally-button px-8"
            >
              Next Step →
            </Button>
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

/**
 * Main export component that provides deployment context
 */
export default function DeployPage() {
  return (
    <PageErrorBoundary>
      <DeploymentProvider initialConfig={INITIAL_CONFIG}>
        <DeployPageContent />
      </DeploymentProvider>
    </PageErrorBoundary>
  );
}
