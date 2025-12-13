// Network switching dropdown with chain icons
'use client';

import { Fragment } from 'react';
import { ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
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
  const currentChain = chains.find(chain => chain.id === currentChainId);

  return (
    <Menu as="div" className="relative">
      <MenuButton as={Fragment}>
        <Button variant="outline" className="gap-2">
          <span className="text-sm font-medium">
            {currentChain?.name || 'Unknown Network'}
          </span>
          <ChevronDownIcon className="w-4 h-4" />
        </Button>
      </MenuButton>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute left-0 mt-2 z-50 min-w-[240px] origin-top-left rounded-md border bg-popover text-popover-foreground shadow-md focus:outline-none">
          <div className="py-1">
            {chains.map((chain) => (
              <MenuItem key={chain.id} as={Fragment}>
                {({ focus }) => (
                  <button
                    type="button"
                    onClick={() => onNetworkSwitch(chain.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm transition-colors",
                      focus ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
                      currentChainId === chain.id && "bg-accent/60 text-foreground"
                    )}
                  >
                    {chain.name}
                  </button>
                )}
              </MenuItem>
            ))}

            <div className="my-1 border-t" />

            <MenuItem as={Fragment}>
              {({ focus }) => (
                <button
                  type="button"
                  onClick={onAddCustomNetwork}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 text-primary",
                    focus ? "bg-accent" : "hover:bg-accent"
                  )}
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Custom Network
                </button>
              )}
            </MenuItem>
          </div>
        </MenuItems>
      </Transition>
    </Menu>
  );
}
