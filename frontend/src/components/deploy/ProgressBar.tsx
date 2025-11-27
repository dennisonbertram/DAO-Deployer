'use client'
import { DeploymentStep } from '@/types/deploy';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';

interface ProgressBarProps {
  steps: DeploymentStep[];
  currentStep: number;
}

function ProgressBar({ steps, currentStep }: ProgressBarProps) {
  // Memoize short titles
  const shortTitles: Record<number, string> = useMemo(() => ({
    1: 'Basics',
    2: 'Governance',
    3: 'Advanced',
    4: 'Review',
  }), []);
  return (
    <div className="w-full space-y-2 pb-8">
      <div className="relative w-full py-2">
        {/* Full-width background line */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-border" />
        
        {/* Step containers with equal width */}
        <div className="relative flex w-full">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center" style={{ width: `${100 / steps.length}%` }}>
              {/* Step content */}
              <div className="relative z-10 flex items-center gap-3 bg-gray-50 pr-4">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                    step.isComplete
                      ? 'bg-primary text-primary-foreground'
                      : step.isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.isComplete ? <Check className="w-5 h-5" /> : step.id}
                </div>
                <div
                  className={cn(
                    'text-xs sm:text-sm whitespace-nowrap leading-snug',
                    step.isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  )}
                  title={step.title}
                >
                  {shortTitles[step.id] ?? step.title.split(' ')[0]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Step {currentStep} of {steps.length}</p>
      </div>
    </div>
  );
}

// Wrap component in React.memo to prevent unnecessary re-renders when props haven't changed
export default memo(ProgressBar);
