import type { Metadata } from 'next'
import { DM_Sans, Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-sans',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-brand',
})

export const metadata: Metadata = {
  title: 'DAO Deployer - Sovereign DAO Deployment Platform',
  description: 'Deploy and manage fully sovereign DAOs with deterministic addresses across all networks',
  keywords: ['DAO', 'Governance', 'Ethereum', 'DeFi', 'Web3', 'Smart Contracts'],
  authors: [{ name: 'Tally Team' }],
  openGraph: {
    title: 'DAO Deployer - Sovereign DAO Deployment Platform',
    description: 'Deploy and manage fully sovereign DAOs with deterministic addresses across all networks',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', dmSans.variable, inter.variable)}>
        {children}
      </body>
    </html>
  )
}