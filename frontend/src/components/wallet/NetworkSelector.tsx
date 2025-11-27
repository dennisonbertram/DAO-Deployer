// Network switching dropdown with chain icons
'use client';

import { useState } from 'react';
import { ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { chains } from '@/lib/wagmi';
import { Button } from '@/components/ui/button';

export interface NetworkSelectorProps {
  currentChainId: number;
  onNetworkSwitch: (chainId: number) => void;
  onAddCustomNetwork: () => void;
}

export function NetworkSelector({
  currentChainId,
  onNetworkSwitch,
  onAddCustomNetwork
}: NetworkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentChain = chains.find(chain => chain.id === currentChainId);

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <span className="text-sm font-medium">
          {currentChain?.name || 'Unknown Network'}
        </span>
        <ChevronDownIcon className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 min-w-[220px] rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="py-1">
            {chains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => {
                  onNetworkSwitch(chain.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                  currentChainId === chain.id && "bg-accent/60 text-foreground"
                )}
              >
                {chain.name}
              </button>
            ))}

            <div className="my-1 border-t" />

            <button
              onClick={() => {
                onAddCustomNetwork();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2 text-primary"
            >
              <PlusIcon className="w-4 h-4" />
              Add Custom Network
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
