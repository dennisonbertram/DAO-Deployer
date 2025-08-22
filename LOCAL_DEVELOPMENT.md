# Local Development Setup

This guide explains how to set up a complete local development environment for the DAO Deployer project, including Anvil blockchain, smart contracts, and frontend integration.

## Overview

The local development setup provides:
- **Anvil**: Local Ethereum blockchain for testing
- **Automated Contract Deployment**: Contracts deployed to local chain
- **Frontend Integration**: Frontend connected to local contracts
- **Hot Reloading**: Automatic contract redeployment on changes
- **MetaMask Integration**: Pre-configured accounts for testing

## Prerequisites

### Required Software

1. **Node.js & npm** (v18+ recommended)
   ```bash
   # Check versions
   node --version
   npm --version
   ```

2. **Foundry** (includes Anvil, Forge, Cast)
   ```bash
   # Install Foundry
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   
   # Verify installation
   anvil --version
   forge --version
   ```

3. **File Watcher** (for hot reloading)
   ```bash
   # macOS
   brew install fswatch
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install inotify-tools
   ```

## Quick Start

### Option 1: Basic Local Development
```bash
npm run dev:local
```

### Option 2: Enhanced with Hot Reloading
```bash
npm run dev:local:watch
```

The enhanced version includes:
- Automatic contract rebuilding and redeployment on file changes
- Real-time frontend updates when contracts change
- Improved developer experience

## What Happens During Setup

1. **Anvil Blockchain**: Starts on `localhost:8545`
   - Chain ID: `31337`
   - 10 pre-funded accounts with 10,000 ETH each
   - Compatible with MetaMask

2. **Contract Deployment**: 
   - Builds all smart contracts using Forge
   - Deploys factory and implementation contracts
   - Saves contract addresses to `local-contracts.json`

3. **Frontend Setup**:
   - Installs dependencies if needed
   - Starts Next.js development server
   - Automatically connects to local contracts

4. **Hot Reloading** (enhanced version):
   - Watches for changes in contract files
   - Automatically rebuilds and redeploys on changes
   - Updates frontend with new contract addresses

## Services & Ports

| Service | Port | URL |
|---------|------|-----|
| Anvil Blockchain | 8545 | http://localhost:8545 |
| Frontend App | 3000 | http://localhost:3000 |

## MetaMask Configuration

### Adding Local Network
1. Open MetaMask
2. Add Network → Add Network Manually
3. Enter network details:
   - **Network Name**: Localhost 8545
   - **RPC URL**: http://localhost:8545
   - **Chain ID**: 31337
   - **Currency Symbol**: ETH

### Importing Test Account
Use the default Anvil account for testing:
- **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

⚠️ **Warning**: Never use this private key on mainnet or with real funds!

## Available Commands

### Development Commands
```bash
# Basic local development
npm run dev:local

# Enhanced with hot reloading
npm run dev:local:watch

# Watch contracts only (if services already running)
npm run contracts:watch
```

### Individual Service Commands
```bash
# Start only Anvil blockchain
npm run contracts:anvil

# Deploy contracts to local Anvil
npm run contracts:deploy:local

# Start only frontend (requires contracts deployed)
npm run frontend:dev
```

### Build & Test Commands
```bash
# Build contracts
npm run contracts:build

# Test contracts
npm run contracts:test

# Build frontend
npm run frontend:build

# Run all tests
npm run test

# Lint all code
npm run lint
```

## Development Workflow

### Making Contract Changes

1. **With Hot Reloading** (`npm run dev:local:watch`):
   - Edit contract files in `contracts/src/`
   - Save the file
   - Watch console for automatic rebuild and redeploy
   - Frontend automatically picks up new contract addresses

2. **Without Hot Reloading** (`npm run dev:local`):
   - Edit contract files
   - Manually redeploy: `npm run contracts:deploy:local`
   - Refresh frontend to pick up changes

### Frontend Development

- Frontend runs in standard Next.js development mode
- Changes to frontend code automatically reload
- Contract addresses are loaded from `/public/local-contracts.json`

## File Structure

```
dao-deployer/
├── contracts/
│   ├── src/                    # Smart contract source files
│   ├── test/                   # Contract tests
│   ├── script/                 # Deployment scripts
│   │   ├── LocalDeploy.s.sol  # Local deployment script
│   │   └── DeterministicDeploy.s.sol
│   └── local-contracts.json   # Generated contract addresses
├── frontend/
│   ├── public/
│   │   └── local-contracts.json # Contract addresses for frontend
│   └── src/
│       └── lib/contracts/
│           └── addresses.ts    # Contract address configuration
├── scripts/
│   ├── dev-local.sh           # Basic development setup
│   ├── dev-local-watch.sh     # Enhanced setup with hot reload
│   └── watch-contracts.sh     # Contract file watcher
└── *.log                      # Service logs
```

## Logs & Debugging

### Log Files
- `anvil.log`: Blockchain logs and transactions
- `frontend.log`: Next.js development server logs
- `watcher.log`: Contract hot-reload logs (enhanced mode)

### Viewing Logs
```bash
# Watch Anvil logs
tail -f anvil.log

# Watch frontend logs
tail -f frontend.log

# Watch contract watcher logs
tail -f watcher.log
```

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill processes using the ports
   pkill -f "anvil.*8545"
   pkill -f "next.*3000"
   ```

2. **Contracts Not Deployed**
   - Check `anvil.log` for blockchain errors
   - Ensure Anvil is running before deployment
   - Manually redeploy: `npm run contracts:deploy:local`

3. **Frontend Can't Find Contracts**
   - Ensure `local-contracts.json` exists in `frontend/public/`
   - Check contract addresses are not zero addresses
   - Verify MetaMask is connected to localhost network

4. **Hot Reloading Not Working**
   - Install file watcher: `brew install fswatch` (macOS) or `apt-get install inotify-tools` (Linux)
   - Check `watcher.log` for errors
   - Restart with `npm run dev:local:watch`

## Stopping the Development Environment

Press `Ctrl+C` in the terminal running the development script. This will:
- Stop all running services (Anvil, Frontend, Watcher)
- Clean up background processes
- Remove PID files
- Display shutdown confirmation

## Advanced Usage

### Custom Anvil Configuration

Edit `contracts/package.json` to modify Anvil settings:
```json
{
  "scripts": {
    "anvil": "anvil --host 0.0.0.0 --port 8545 --accounts 10 --balance 10000"
  }
}
```

### Custom Deployment Configuration

Edit `contracts/script/LocalDeploy.s.sol` to modify deployment parameters or add custom initialization logic.

### Frontend Chain Configuration

Edit `frontend/src/lib/contracts/addresses.ts` to add custom local chain configurations or contract addresses.

## Production Deployment

This local setup is for development only. For production deployment:
1. Use the deterministic deployment script: `contracts/script/DeterministicDeploy.s.sol`
2. Configure proper private keys and RPC URLs
3. Deploy to testnets before mainnet
4. Update frontend contract addresses for production networks

## Support

If you encounter issues:
1. Check the logs in `anvil.log`, `frontend.log`, and `watcher.log`
2. Ensure all prerequisites are installed
3. Try restarting the development environment
4. Check that ports 3000 and 8545 are available