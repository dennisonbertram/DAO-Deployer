'use client'

import { DeploymentStep } from '@/types/deploy';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  steps: DeploymentStep[];
  currentStep: number;
}

export default function ProgressBar({ steps, currentStep }: ProgressBarProps) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
              step.isComplete
                ? 'bg-primary text-primary-foreground'
                : step.isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
            )}>
              {step.isComplete ? (
                <Check className="w-5 h-5" />
              ) : (
                step.id
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-4 min-w-[80px] transition-colors",
                step.isComplete ? 'bg-primary' : 'bg-border'
              )} />
            )}
          </div>
        ))}
      </div>
      
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold">
          Step {currentStep} of {steps.length}
        </h2>
        <p className="text-muted-foreground">
          {steps.find(s => s.id === currentStep)?.title || 'Unknown Step'}
        </p>
      </div>
    </div>
  );
}