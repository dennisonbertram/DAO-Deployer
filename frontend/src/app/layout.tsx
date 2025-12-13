import type { Metadata } from 'next'
import Link from 'next/link'
import { DM_Sans, Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { WalletProvider } from '@/providers/WalletProvider'
import { WalletHeader } from '@/components/WalletHeader'
import { Toaster } from '@/components/ui/toaster'
import { ClientLayout } from '@/components/ClientLayout'

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
        <WalletProvider>
          <ClientLayout>
            <WalletHeader />
            <main className="min-h-screen">
              {children}
            </main>
            <footer className="border-t border-border">
              <div className="mx-auto max-w-5xl px-6 py-6 flex items-center justify-between text-sm text-muted-foreground">
                <p className="m-0">© {new Date().getFullYear()} DAO Deployer</p>
                <nav className="flex items-center gap-4">
                  <Link href="/terms" className="hover:text-foreground underline underline-offset-4">Terms</Link>
                  <Link href="/privacy" className="hover:text-foreground underline underline-offset-4">Privacy</Link>
                </nav>
              </div>
            </footer>
            <Toaster />
          </ClientLayout>
        </WalletProvider>
      </body>
    </html>
  )
}
