'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { isAddress } from 'viem'
import { useChainId } from 'wagmi'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/hooks/use-toast'
import { useAllDAOs } from '@/hooks/contracts/useFactory'
import { chains } from '@/lib/wagmi'

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getBlockExplorerUrl(chainId: number, address: string): string | undefined {
  const chain = chains.find(c => c.id === chainId)
  if (!chain || !('blockExplorers' in chain) || !chain.blockExplorers?.default?.url) return undefined
  return `${chain.blockExplorers.default.url}/address/${address}`
}

export default function DAODetailPage() {
  const params = useParams()
  const chainId = useChainId()
  const { toast } = useToast()
  const { daos, isLoading } = useAllDAOs()

  const addressParamRaw = (params?.address as string | string[] | undefined) ?? ''
  const addressParam = Array.isArray(addressParamRaw) ? addressParamRaw[0] : addressParamRaw
  const address = addressParam?.trim()

  const isValid = Boolean(address) && isAddress(address)

  const dao = useMemo(() => {
    if (!isValid) return undefined
    const needle = address.toLowerCase()
    return daos.find(d =>
      d.governor.toLowerCase() === needle ||
      d.token.toLowerCase() === needle ||
      d.timelock.toLowerCase() === needle
    )
  }, [address, daos, isValid])

  const explorerUrl = useMemo(() => {
    if (!isValid) return undefined
    return getBlockExplorerUrl(chainId, address)
  }, [address, chainId, isValid])

  const chainName = useMemo(() => chains.find(c => c.id === chainId)?.name || 'Unknown Network', [chainId])

  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <EmptyState
            title="Invalid address"
            description="This page expects a contract address in the URL."
            action={{
              label: 'Back to Explore',
              onClick: () => { window.location.href = '/explore' }
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="font-brand text-4xl font-bold tracking-tight sm:text-5xl mb-tally-4">
            DAO details
          </h1>
          <p className="text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            Showing details for <span className="font-mono text-foreground">{formatAddress(address)}</span> on {chainName}.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="rounded-tally-container border-tally-gray-3">
            <CardHeader>
              <CardTitle>Contract</CardTitle>
              <CardDescription className="font-mono">
                {address}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="rounded-tally-button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(address)
                      toast({ title: 'Copied', description: 'Address copied to clipboard.' } as any)
                    } catch {
                      toast({ title: 'Copy failed', description: 'Unable to copy to clipboard.', variant: 'destructive' } as any)
                    }
                  }}
                >
                  Copy address
                </Button>
                {explorerUrl && (
                  <Button variant="outline" className="rounded-tally-button" asChild>
                    <a href={explorerUrl} target="_blank" rel="noopener noreferrer">
                      View on explorer
                    </a>
                  </Button>
                )}
              </div>

              <Button variant="secondary" className="rounded-tally-button" asChild>
                <Link href="/explore">Back to Explore</Link>
              </Button>
            </CardContent>
          </Card>

          {dao && (
            <Card className="rounded-tally-container border-tally-gray-3">
              <CardHeader>
                <CardTitle>{dao.name}</CardTitle>
                <CardDescription>Deployed DAO metadata from the factory event.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Token</span>
                  <span className="font-mono">{dao.token}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Governor</span>
                  <span className="font-mono">{dao.governor}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Timelock</span>
                  <span className="font-mono">{dao.timelock}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Deployer</span>
                  <span className="font-mono">{dao.deployer}</span>
                </div>
                {isLoading && (
                  <p className="text-xs text-muted-foreground">Loading more details…</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

