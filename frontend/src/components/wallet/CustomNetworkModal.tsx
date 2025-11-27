// Modal for adding custom networks
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface CustomNetwork {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: { http: string[] };
    public: { http: string[] };
  };
  blockExplorers?: {
    default: {
      name: string;
      url: string;
    };
  };
}

export interface CustomNetworkModalProps {
  onClose: () => void;
  onAdd: (network: CustomNetwork) => void;
}

export function CustomNetworkModal({ onClose, onAdd }: CustomNetworkModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    chainId: '',
    rpcUrl: '',
    symbol: '',
    blockExplorer: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const network: CustomNetwork = {
      id: parseInt(formData.chainId),
      name: formData.name,
      nativeCurrency: {
        name: formData.symbol,
        symbol: formData.symbol,
        decimals: 18
      },
      rpcUrls: {
        default: { http: [formData.rpcUrl] },
        public: { http: [formData.rpcUrl] },
      },
      blockExplorers: formData.blockExplorer ? {
        default: {
          name: 'Explorer',
          url: formData.blockExplorer,
        }
      } : undefined,
    };

    onAdd(network);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 flex items-center justify-center">
      <div className="bg-background border rounded-lg shadow-lg p-6 w-96 max-w-full">
        <h3 className="text-lg font-semibold mb-4">Add Custom Network</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Network Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Custom Network"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Chain ID</label>
            <input
              type="number"
              value={formData.chainId}
              onChange={(e) => setFormData(prev => ({ ...prev, chainId: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
              placeholder="1234"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">RPC URL</label>
            <input
              type="url"
              value={formData.rpcUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, rpcUrl: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
              placeholder="https://rpc.example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Currency Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
              placeholder="ETH"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Block Explorer URL (Optional)</label>
            <input
              type="url"
              value={formData.blockExplorer}
              onChange={(e) => setFormData(prev => ({ ...prev, blockExplorer: e.target.value }))}
              className="w-full border rounded-md px-3 py-2"
              placeholder="https://explorer.example.com"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add Network
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
