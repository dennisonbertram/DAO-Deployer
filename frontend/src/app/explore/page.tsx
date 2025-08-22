'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingCard } from '@/components/ui/loading-card'
import { EmptyState } from '@/components/ui/empty-state'

// Mock DAO data structure
interface DAO {
  id: string
  name: string
  description: string
  tokenSymbol: string
  totalSupply: string
  totalProposals: number
  activeProposals: number
  network: string
  deployedAt: string
}

export default function ExplorePage() {
  const [daos, setDaos] = useState<DAO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simulate API call to fetch DAOs
    const fetchDAOs = async () => {
      setLoading(true)
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // For now, return empty array to show empty state
        // In real implementation, this would fetch from API
        const mockDAOs: DAO[] = []
        
        setDaos(mockDAOs)
      } catch (err) {
        setError('Failed to load DAOs')
      } finally {
        setLoading(false)
      }
    }

    fetchDAOs()
  }, [])

  if (loading) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <EmptyState
            title="Failed to Load DAOs"
            description={error}
            icon={
              <svg className="w-12 h-12 text-tally-red-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            action={{
              label: "Try Again",
              onClick: () => window.location.reload()
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
            Discover and interact with {daos.length} sovereign DAOs deployed across various networks
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-tally-6">
          {daos.map((dao) => (
            <Card key={dao.id} className="rounded-tally-container border-tally-gray-3 hover:border-tally-gray-4 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{dao.name}</span>
                  <span className="text-sm font-mono bg-tally-gray-2 px-2 py-1 rounded-tally-tag">
                    {dao.tokenSymbol}
                  </span>
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {dao.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-tally-3 mb-tally-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-tally-gray-6">Total Supply</span>
                    <span className="font-medium">{dao.totalSupply}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-tally-gray-6">Proposals</span>
                    <span className="font-medium">
                      {dao.activeProposals} active / {dao.totalProposals} total
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-tally-gray-6">Network</span>
                    <span className="font-medium capitalize">{dao.network}</span>
                  </div>
                </div>
                
                <Button asChild className="w-full rounded-tally-button">
                  <Link href={`/dao/${dao.id}`}>
                    View DAO
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

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