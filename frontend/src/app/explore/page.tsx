'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useChainId } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingCard } from '@/components/ui/loading-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { useAllDAOs } from '@/hooks/contracts/useFactory'
import { DeployedDAO } from '@/lib/contracts/types'
import { chains } from '@/lib/wagmi'
import { PageErrorBoundary } from '@/components/PageErrorBoundary'

// Utility function to format addresses
function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Utility function to get block explorer URL
function getBlockExplorerUrl(chainId: number, address: string): string | undefined {
  const chain = chains.find(c => c.id === chainId)
  if (!chain || !('blockExplorers' in chain) || !chain.blockExplorers?.default?.url) {
    return undefined
  }
  return `${chain.blockExplorers.default.url}/address/${address}`
}

// Utility function to format timestamp
function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function ExplorePageContent() {
  const { daos, isLoading, isError, error, refetch } = useAllDAOs()
  const chainId = useChainId()
  const [searchQuery, setSearchQuery] = useState('')

  // Filter DAOs based on search query
  const filteredDAOs = useMemo(() => {
    if (!searchQuery.trim()) return daos

    const query = searchQuery.toLowerCase()
    return daos.filter((dao: DeployedDAO) =>
      dao.name.toLowerCase().includes(query) ||
      dao.token.toLowerCase().includes(query) ||
      dao.governor.toLowerCase().includes(query) ||
      dao.deployer.toLowerCase().includes(query)
    )
  }, [daos, searchQuery])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-tally-12">
            <h1 className="font-brand text-4xl font-bold tracking-tight sm:text-6xl mb-tally-6">
              Explore DAOs
            </h1>
            <p className="text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
              Discover and interact with sovereign DAOs deployed on various networks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-tally-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingCard key={i} showHeader={true} lines={4} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <EmptyState
            title="Failed to Load DAOs"
            description={error?.message || 'An error occurred while loading DAOs'}
            icon={
              <svg className="w-12 h-12 text-tally-red-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            action={{
              label: "Try Again",
              onClick: () => refetch()
            }}
          />
        </div>
      </div>
    )
  }

  if (daos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-tally-12">
            <h1 className="font-brand text-4xl font-bold tracking-tight sm:text-6xl mb-tally-6">
              Explore DAOs
            </h1>
            <p className="text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
              Discover and interact with sovereign DAOs deployed on various networks
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <EmptyState
              title="No DAOs Found"
              description="Be the first to deploy a DAO and start building your community! Deploy a fully sovereign DAO in just a few minutes with complete governance capabilities."
              icon={
                <svg className="w-12 h-12 text-tally-gray-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
              action={{
                label: "Deploy Your DAO",
                onClick: () => window.location.href = '/deploy'
              }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-tally-12">
          <h1 className="font-brand text-4xl font-bold tracking-tight sm:text-6xl mb-tally-6">
            Explore DAOs
          </h1>
          <p className="text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            Discover and interact with {daos.length} sovereign DAO{daos.length !== 1 ? 's' : ''} deployed on this network
          </p>
        </div>

        {/* Search Bar */}
        {daos.length > 0 && (
          <div className="max-w-2xl mx-auto mb-tally-9">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-tally-gray-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                type="text"
                placeholder="Search by name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-tally-input"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-tally-gray-6 mt-2">
                Found {filteredDAOs.length} result{filteredDAOs.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* DAO Cards */}
        {filteredDAOs.length === 0 && searchQuery ? (
          <div className="max-w-2xl mx-auto">
            <EmptyState
              title="No DAOs Found"
              description="No DAOs match your search query. Try adjusting your search terms."
              icon={
                <svg className="w-12 h-12 text-tally-gray-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
              action={{
                label: "Clear Search",
                onClick: () => setSearchQuery('')
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-tally-6">
            {filteredDAOs.map((dao: DeployedDAO) => (
              <Card key={dao.token} className="rounded-tally-container border-tally-gray-3 hover:border-tally-gray-4 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {dao.name}
                  </CardTitle>
                  <CardDescription className="text-xs font-mono">
                    Deployed {formatDate(dao.timestamp)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-tally-3 mb-tally-6">
                    <div className="text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-tally-gray-6">Token</span>
                        {getBlockExplorerUrl(chainId, dao.token) ? (
                          <a
                            href={getBlockExplorerUrl(chainId, dao.token)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-tally-blue-6 hover:text-tally-blue-7 hover:underline"
                          >
                            {formatAddress(dao.token)}
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-tally-gray-6">
                            {formatAddress(dao.token)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-tally-gray-6">Governor</span>
                        {getBlockExplorerUrl(chainId, dao.governor) ? (
                          <a
                            href={getBlockExplorerUrl(chainId, dao.governor)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-tally-blue-6 hover:text-tally-blue-7 hover:underline"
                          >
                            {formatAddress(dao.governor)}
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-tally-gray-6">
                            {formatAddress(dao.governor)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-tally-gray-6">Timelock</span>
                        {getBlockExplorerUrl(chainId, dao.timelock) ? (
                          <a
                            href={getBlockExplorerUrl(chainId, dao.timelock)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-tally-blue-6 hover:text-tally-blue-7 hover:underline"
                          >
                            {formatAddress(dao.timelock)}
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-tally-gray-6">
                            {formatAddress(dao.timelock)}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-tally-gray-6">Deployer</span>
                        {getBlockExplorerUrl(chainId, dao.deployer) ? (
                          <a
                            href={getBlockExplorerUrl(chainId, dao.deployer)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-tally-blue-6 hover:text-tally-blue-7 hover:underline"
                          >
                            {formatAddress(dao.deployer)}
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-tally-gray-6">
                            {formatAddress(dao.deployer)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {getBlockExplorerUrl(chainId, dao.governor) ? (
                    <Button asChild className="w-full rounded-tally-button">
                      <a
                        href={getBlockExplorerUrl(chainId, dao.governor)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Governor Contract
                      </a>
                    </Button>
                  ) : (
                    <Button className="w-full rounded-tally-button" disabled>
                      No explorer for this network
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center mt-tally-15">
          <Button asChild variant="outline" size="lg" className="rounded-tally-button">
            <Link href="/deploy">
              Deploy Your Own DAO
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ExplorePage() {
  return (
    <PageErrorBoundary>
      <ExplorePageContent />
    </PageErrorBoundary>
  );
}
