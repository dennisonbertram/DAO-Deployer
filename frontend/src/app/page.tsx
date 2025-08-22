import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">DAO Deployer</h1>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/explore" className="text-muted-foreground hover:text-foreground transition-colors">
                Explore DAOs
              </Link>
              <Button asChild>
                <Link href="/deploy">Deploy DAO</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="font-brand text-4xl font-bold tracking-tight sm:text-6xl">
            Deploy Your DAO in{' '}
            <span className="text-tally-purple-6">Minutes</span>
          </h1>
          <p className="mx-auto mt-tally-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Create fully sovereign, upgradeable DAOs with complete governance capabilities. 
            Deterministic addresses across all networks, built for true decentralization.
          </p>
          <div className="mt-tally-10 flex items-center justify-center gap-tally-6">
            <Button size="lg" className="rounded-tally-button" asChild>
              <Link href="/deploy">Deploy Your DAO</Link>
            </Button>
            <Button variant="outline" size="lg" className="rounded-tally-button" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mx-auto mt-tally-15 max-w-2xl sm:mt-tally-20 lg:mt-tally-20 lg:max-w-none">
          <div className="grid max-w-xl grid-cols-1 gap-tally-8 lg:max-w-none lg:grid-cols-3">
            <Card className="text-center rounded-tally-container border-tally-gray-3">
              <CardHeader className="pb-tally-2">
                <CardTitle className="font-brand text-3xl font-semibold tracking-tight text-tally-purple-7 sm:text-5xl">
                  0
                </CardTitle>
                <CardDescription className="text-tally-gray-6">DAOs Deployed</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center rounded-tally-container border-tally-gray-3">
              <CardHeader className="pb-tally-2">
                <CardTitle className="font-brand text-3xl font-semibold tracking-tight text-tally-green-7 sm:text-5xl">
                  0
                </CardTitle>
                <CardDescription className="text-tally-gray-6">Total Proposals</CardDescription>
              </CardHeader>
            </Card>
            <Card className="text-center rounded-tally-container border-tally-gray-3">
              <CardHeader className="pb-tally-2">
                <CardTitle className="font-brand text-3xl font-semibold tracking-tight text-tally-orange-6 sm:text-5xl">
                  6
                </CardTitle>
                <CardDescription className="text-tally-gray-6">Networks Supported</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="mx-auto mt-tally-30 max-w-7xl sm:mt-tally-30">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-tally-purple-6">
              Complete Sovereignty
            </h2>
            <p className="font-brand mt-tally-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need for DAO governance
            </p>
            <p className="mt-tally-6 text-lg leading-8 text-muted-foreground">
              Deploy DAOs that are truly owned by their communities, with no ongoing factory control 
              and complete upgrade sovereignty through governance.
            </p>
          </div>
          <div className="mx-auto mt-tally-15 max-w-2xl sm:mt-tally-20 lg:mt-tally-20 lg:max-w-none">
            <div className="grid max-w-xl grid-cols-1 gap-tally-6 lg:max-w-none lg:grid-cols-3">
              <Card className="rounded-tally-container">
                <CardHeader>
                  <CardTitle className="flex items-center gap-tally-3">
                    <div className="h-5 w-5 flex-none rounded-full bg-tally-purple-6" />
                    True Sovereignty
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Each DAO controls all its own upgrades through governance. No factory backdoors or centralized control.
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-tally-container">
                <CardHeader>
                  <CardTitle className="flex items-center gap-tally-3">
                    <div className="h-5 w-5 flex-none rounded-full bg-tally-green-6" />
                    Cross-Chain Consistency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Deterministic addresses using CREATE2. Deploy the same DAO system across all networks.
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-tally-container">
                <CardHeader>
                  <CardTitle className="flex items-center gap-tally-3">
                    <div className="h-5 w-5 flex-none rounded-full bg-tally-orange-6" />
                    Complete Governance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Full governance stack with token voting, proposals, delegation, and timelock security.
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-tally-container">
                <CardHeader>
                  <CardTitle className="flex items-center gap-tally-3">
                    <div className="h-5 w-5 flex-none rounded-full bg-tally-purple-5" />
                    Rapid Deployment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Deploy your complete DAO system in minutes with guided configuration and validation.
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-tally-container">
                <CardHeader>
                  <CardTitle className="flex items-center gap-tally-3">
                    <div className="h-5 w-5 flex-none rounded-full bg-tally-green-7" />
                    UUPS Upgrades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Secure upgrade pattern with governance approval and timelock delays for all changes.
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-tally-container">
                <CardHeader>
                  <CardTitle className="flex items-center gap-tally-3">
                    <div className="h-5 w-5 flex-none rounded-full bg-tally-red-6" />
                    Battle-Tested
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Built with OpenZeppelin contracts and comprehensive test coverage for maximum security.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mx-auto mt-32 max-w-2xl text-center sm:mt-40">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to launch your DAO?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Join the growing ecosystem of sovereign DAOs. Deploy in minutes, govern for years.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button size="lg" asChild>
              <Link href="/deploy">Get Started</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mx-auto mt-32 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="border-t py-16">
          <div className="text-center">
            <p className="text-sm leading-5 text-muted-foreground">
              Built with ❤️ for the decentralized future
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}