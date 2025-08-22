# DAO Deployer Monorepo

A comprehensive platform for deploying and managing sovereign DAOs with deterministic addresses across all networks.

## Repository Structure

This is a monorepo containing two main workspaces:

```
dao-deployer/
├── contracts/          # Smart contract system (Foundry)
│   ├── src/            # Solidity contracts
│   ├── test/           # Contract tests
│   ├── script/         # Deployment scripts
│   └── docs/           # Technical documentation
├── frontend/           # Next.js web application
│   ├── src/            # Frontend source code
│   ├── components/     # React components
│   └── lib/            # Utilities and integrations
└── package.json        # Root workspace configuration
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (for contracts)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd dao-deployer

# Install dependencies for all workspaces
npm install

# Install Foundry dependencies
cd contracts
forge install
cd ..
```

### Development

#### Smart Contracts

```bash
# Build contracts
npm run contracts:build

# Run tests
npm run contracts:test

# Run tests with gas reporting
cd contracts && npm run test:gas

# Deploy contracts (requires .env setup)
cd contracts && npm run deploy -- --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

#### Frontend Application

```bash
# Start development server
npm run frontend:dev

# Build for production
npm run frontend:build

# Run linting
cd frontend && npm run lint
```

### Workspace Commands

```bash
# Run command in all workspaces
npm run <script> --workspaces

# Run command in specific workspace
npm run <script> --workspace=<workspace-name>

# Examples:
npm run build --workspaces           # Build everything
npm run test --workspace=contracts   # Test contracts only
npm run dev --workspace=frontend     # Start frontend dev server
```

## Project Overview

### Smart Contract System

The contracts workspace contains a comprehensive DAO deployment system:

- **SimpleDAOFactoryV2**: Factory for deploying DAO systems with deterministic CREATE2 addresses
- **SimpleDAOTokenUpgradeable**: ERC20 governance token with voting and delegation
- **SimpleDAOGovernorUpgradeable**: OpenZeppelin Governor with timelock integration
- **SimpleDAOTimelockUpgradeable**: Secure timelock for governance execution

**Key Features:**
- True DAO sovereignty (each DAO controls its own upgrades)
- Deterministic deployment across all networks
- UUPS upgrade pattern with governance control
- Comprehensive test coverage (75+ tests)

### Frontend Application

The frontend workspace provides a complete web interface for:

- **DAO Discovery**: Browse and explore deployed DAOs
- **Deployment Wizard**: Guided 4-step DAO configuration and deployment
- **Governance Interface**: Proposal creation, voting, and delegation
- **Analytics Dashboard**: Comprehensive DAO metrics and insights

**Technology Stack:**
- Next.js 14 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Wagmi + Viem for Web3 integration
- React Query for state management

## Network Support

The system supports deterministic deployment across:

- Ethereum Mainnet
- Polygon
- Arbitrum One
- Optimism
- Base
- All corresponding testnets

## Documentation

- [Smart Contract System](./contracts/docs/SMART_CONTRACT_SYSTEM.md) - Complete technical documentation
- [Frontend Development Plan](./contracts/docs/FRONTEND_DEVELOPMENT_PLAN.md) - UI/UX specifications
- [Deployment Guide](./contracts/README_DEPLOYMENT.md) - Production deployment instructions

## Development Workflow

### Adding Features

1. **Smart Contracts**: Add contracts in `contracts/src/`, tests in `contracts/test/`
2. **Frontend**: Add components in `frontend/src/components/`, pages in `frontend/src/app/`
3. **Integration**: Update types and hooks in `frontend/src/lib/` and `frontend/src/hooks/`

### Testing

```bash
# Test everything
npm run test --workspaces

# Test contracts with coverage
cd contracts && forge coverage

# Test frontend
cd frontend && npm run test
```

### Deployment

#### Smart Contracts

```bash
cd contracts

# Predict deployment addresses
forge script script/AddressPredictor.s.sol:AddressPredictor

# Deploy to testnet
forge script script/DeterministicDeploy.s.sol:DeterministicDeploy \
  --rpc-url $RPC_URL_SEPOLIA \
  --private-key $PRIVATE_KEY \
  --broadcast

# Deploy to mainnet
forge script script/DeterministicDeploy.s.sol:DeterministicDeploy \
  --rpc-url $RPC_URL_MAINNET \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

#### Frontend Application

```bash
cd frontend

# Build for production
npm run build

# Deploy to Vercel (example)
vercel deploy --prod
```

## Contributing

1. Create a feature branch from `main`
2. Make changes in the appropriate workspace
3. Add tests for new functionality
4. Ensure all tests pass: `npm run test --workspaces`
5. Submit a pull request

### Code Standards

- **Contracts**: Follow Solidity style guide, add comprehensive tests
- **Frontend**: Use TypeScript, follow React best practices, ensure accessibility
- **Documentation**: Update relevant docs for any public API changes

## Security

This system handles significant value and governance decisions. Security practices:

- All contracts inherit from OpenZeppelin audited contracts
- Comprehensive test coverage with edge cases
- Timelock delays for all governance actions
- No single points of failure or admin keys
- Regular security reviews and audits

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Support

- [GitHub Issues](https://github.com/your-org/dao-deployer/issues) for bug reports
- [GitHub Discussions](https://github.com/your-org/dao-deployer/discussions) for questions
- [Documentation](./contracts/docs/) for technical details