'use client'

import { ReactNode, memo } from 'react';
import { Label } from '@/components/ui/label';
import { HelpCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  tooltip?: string;
}

function FormField({
  label,
  description,
  error,
  required = false,
  children,
  tooltip
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {tooltip && (
          <div className="group relative">
            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-sm rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 border shadow-md">
              {tooltip}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-popover rotate-45 border-r border-b"></div>
            </div>
          </div>
        )}
      </div>
      
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      
      {children}
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}

// Wrap component in React.memo to prevent unnecessary re-renders when props haven't changed
export default memo(FormField);