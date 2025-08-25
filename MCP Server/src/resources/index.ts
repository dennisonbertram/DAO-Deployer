import { SUPPORTED_NETWORKS } from '../networks/index.js';
import { CONTRACT_PATHS, loadAllContractABIs } from '../utils/contracts.js';

/**
 * MCP Resource definitions for the DAO Deployer server
 */

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Get all available MCP resources
 */
export async function listResources(): Promise<MCPResource[]> {
  const resources: MCPResource[] = [];
  
  // Network configuration resources
  resources.push({
    uri: 'dao-deployer://networks/all',
    name: 'All Supported Networks',
    description: 'Complete list of all supported blockchain networks with configuration details',
    mimeType: 'application/json'
  });
  
  resources.push({
    uri: 'dao-deployer://networks/mainnets',
    name: 'Mainnet Networks',
    description: 'List of supported mainnet blockchain networks',
    mimeType: 'application/json'
  });
  
  resources.push({
    uri: 'dao-deployer://networks/testnets',
    name: 'Testnet Networks', 
    description: 'List of supported testnet blockchain networks',
    mimeType: 'application/json'
  });
  
  // Contract ABI resources
  Object.keys(CONTRACT_PATHS).forEach(contractName => {
    resources.push({
      uri: `dao-deployer://contracts/abi/${contractName}`,
      name: `${contractName} ABI`,
      description: `Application Binary Interface for ${contractName} contract`,
      mimeType: 'application/json'
    });
  });
  
  // Contract source code resources
  Object.keys(CONTRACT_PATHS).forEach(contractName => {
    resources.push({
      uri: `dao-deployer://contracts/source/${contractName}`,
      name: `${contractName} Source`,
      description: `Solidity source code for ${contractName} contract`,
      mimeType: 'text/x-solidity'
    });
  });
  
  // Deployment templates
  resources.push({
    uri: 'dao-deployer://templates/factory-deployment',
    name: 'Factory Deployment Template',
    description: 'Template configuration for deploying DAO factory contracts',
    mimeType: 'application/json'
  });
  
  resources.push({
    uri: 'dao-deployer://templates/dao-deployment',
    name: 'DAO Deployment Template',
    description: 'Template configuration for deploying complete DAO systems',
    mimeType: 'application/json'
  });
  
  // Documentation resources
  resources.push({
    uri: 'dao-deployer://docs/quickstart',
    name: 'Quick Start Guide',
    description: 'Step-by-step guide for deploying your first DAO',
    mimeType: 'text/markdown'
  });
  
  resources.push({
    uri: 'dao-deployer://docs/hardware-wallets',
    name: 'Hardware Wallet Guide',
    description: 'Guide for using hardware wallets with the DAO deployer',
    mimeType: 'text/markdown'
  });
  
  resources.push({
    uri: 'dao-deployer://docs/network-requirements',
    name: 'Network Requirements',
    description: 'Requirements and setup for different blockchain networks',
    mimeType: 'text/markdown'
  });
  
  return resources;
}

/**
 * Read the content of a specific resource
 */
export async function readResource(uri: string): Promise<string> {
  const resourceMap: Record<string, () => Promise<string>> = {
    // Network resources
    'dao-deployer://networks/all': () => Promise.resolve(JSON.stringify(SUPPORTED_NETWORKS, null, 2)),
    'dao-deployer://networks/mainnets': () => Promise.resolve(JSON.stringify(
      Object.fromEntries(
        Object.entries(SUPPORTED_NETWORKS).filter(([_, config]) => !config.testnet)
      ), 
      null, 
      2
    )),
    'dao-deployer://networks/testnets': () => Promise.resolve(JSON.stringify(
      Object.fromEntries(
        Object.entries(SUPPORTED_NETWORKS).filter(([_, config]) => config.testnet)
      ), 
      null, 
      2
    )),
    
    // Template resources
    'dao-deployer://templates/factory-deployment': getFactoryDeploymentTemplate,
    'dao-deployer://templates/dao-deployment': getDAODeploymentTemplate,
    
    // Documentation resources
    'dao-deployer://docs/quickstart': getQuickStartGuide,
    'dao-deployer://docs/hardware-wallets': getHardwareWalletGuide,
    'dao-deployer://docs/network-requirements': getNetworkRequirementsGuide
  };
  
  // Handle contract ABI resources
  const contractAbiMatch = uri.match(/^dao-deployer:\/\/contracts\/abi\/(.+)$/);
  if (contractAbiMatch) {
    const contractName = contractAbiMatch[1];
    return getContractABI(contractName);
  }
  
  // Handle contract source resources  
  const contractSourceMatch = uri.match(/^dao-deployer:\/\/contracts\/source\/(.+)$/);
  if (contractSourceMatch) {
    const contractName = contractSourceMatch[1];
    return getContractSource(contractName);
  }
  
  // Get the resource handler
  const resourceHandler = resourceMap[uri];
  if (!resourceHandler) {
    throw new Error(`Resource not found: ${uri}`);
  }
  
  return resourceHandler();
}

/**
 * Get contract ABI as JSON string
 */
async function getContractABI(contractName: string): Promise<string> {
  try {
    const abis = await loadAllContractABIs();
    const abi = abis[contractName];
    
    if (!abi) {
      throw new Error(`ABI not found for contract: ${contractName}`);
    }
    
    return JSON.stringify(abi, null, 2);
  } catch (error: any) {
    throw new Error(`Failed to load ABI for ${contractName}: ${error.message}`);
  }
}

/**
 * Get contract source code
 */
async function getContractSource(contractName: string): Promise<string> {
  // This would read the actual Solidity source files
  // For now, return a placeholder
  return `// Solidity source code for ${contractName}\n// Source files are located in the contracts/src directory\n// Path: ${CONTRACT_PATHS[contractName as keyof typeof CONTRACT_PATHS] || 'Unknown'}`;
}

/**
 * Get factory deployment template
 */
async function getFactoryDeploymentTemplate(): Promise<string> {
  const template = {
    networkName: "sepolia",
    factoryVersion: "v2",
    verifyContract: true,
    gasEstimateMultiplier: 1.2,
    fromAddress: "0x1234567890123456789012345678901234567890",
    description: "Template for preparing DAO factory deployment transactions (use with MCP Ledger server for signing)",
    workflow: "Use prepare-factory-deployment tool, then sign with MCP Ledger server",
    examples: {
      testnet: {
        networkName: "sepolia",
        factoryVersion: "v2",
        verifyContract: true,
        fromAddress: "0x1234567890123456789012345678901234567890",
        gasEstimateMultiplier: 1.2
      },
      mainnet: {
        networkName: "ethereum",
        factoryVersion: "v2", 
        verifyContract: true,
        fromAddress: "0x1234567890123456789012345678901234567890",
        gasEstimateMultiplier: 1.5
      }
    }
  };
  
  return JSON.stringify(template, null, 2);
}

/**
 * Get DAO deployment template
 */
async function getDAODeploymentTemplate(): Promise<string> {
  const template = {
    networkName: "sepolia",
    factoryAddress: "0x1234567890123456789012345678901234567890",
    daoName: "My DAO",
    tokenName: "My DAO Token",
    tokenSymbol: "MDT",
    initialSupply: "1000000000000000000000000",
    governorSettings: {
      votingDelay: 7200,
      votingPeriod: 50400,
      proposalThreshold: "1000000000000000000000",
      quorumPercentage: 10
    },
    timelockSettings: {
      minDelay: 86400,
      proposers: ["0x1234567890123456789012345678901234567890"],
      executors: ["0x1234567890123456789012345678901234567890"]
    },
    verifyContracts: true,
    fromAddress: "0x1234567890123456789012345678901234567890",
    description: "Template for preparing DAO deployment transactions (requires sequential deployment with MCP Ledger server)",
    workflow: "Use prepare-dao-deployment tool to get 3 transactions, sign each with MCP Ledger server in order",
    notes: {
      initialSupply: "Token supply in wei (18 decimals)",
      votingDelay: "Blocks to wait before voting starts", 
      votingPeriod: "Blocks for voting duration",
      proposalThreshold: "Min tokens needed to create proposal (in wei)",
      quorumPercentage: "Minimum % of tokens needed for quorum",
      minDelay: "Timelock delay in seconds (86400 = 1 day)",
      sequentialDeployment: "CRITICAL: Deploy token first, then timelock, then governor (with updated addresses)"
    }
  };
  
  return JSON.stringify(template, null, 2);
}

/**
 * Get quick start guide
 */
async function getQuickStartGuide(): Promise<string> {
  return `# 🚀 DAO Deployer Quick Start Guide

## Two-Server Architecture

This system uses **two MCP servers** working together:

1. **DAO Deployer MCP Server** - Prepares deployment transactions
2. **MCP Ledger Server** - Signs transactions securely with hardware wallet

## Prerequisites

1. **Both MCP Servers Running**
   - DAO Deployer MCP server (this one)
   - MCP Ledger server for secure signing
   - Both configured in your Claude Code

2. **Hardware Wallet Setup** (via MCP Ledger server)
   - Ledger device connected and unlocked
   - Ethereum app installed and open
   - Device configured in MCP Ledger server

3. **Environment Setup**
   - API keys for block explorers (optional, for verification)
   - Network RPC access (Alchemy, Infura, etc.)

## Step 1: Prepare Factory Deployment

Use this server to prepare the factory deployment transaction:

\`\`\`json
{
  "networkName": "sepolia",
  "factoryVersion": "v2",
  "verifyContract": true,
  "fromAddress": "0x...",
  "gasEstimateMultiplier": 1.2
}
\`\`\`

**Tool**: \`prepare-factory-deployment\`

## Step 2: Sign & Broadcast with MCP Ledger Server

Take the prepared transaction to your MCP Ledger server:

\`\`\`json
{
  "tool": "sign_and_broadcast_transaction",
  "transaction": "...", 
  "network": "sepolia"
}
\`\`\`

## Step 3: Prepare DAO Deployment Plan

Once factory is deployed, prepare the DAO deployment:

\`\`\`json
{
  "networkName": "sepolia",
  "factoryAddress": "0x...",
  "daoName": "My First DAO",
  "tokenName": "My DAO Token",
  "tokenSymbol": "MDT",
  "initialSupply": "1000000000000000000000000",
  "governorSettings": {
    "votingDelay": 7200,
    "votingPeriod": 50400,
    "proposalThreshold": "1000000000000000000000",
    "quorumPercentage": 10
  },
  "timelockSettings": {
    "minDelay": 86400,
    "proposers": ["0xYourAddress"],
    "executors": ["0xYourAddress"]
  }
}
\`\`\`

**Tool**: \`prepare-dao-deployment\`

## Step 4: Sequential Deployment with MCP Ledger Server

The DAO deployment returns 3 transactions to sign in order:

1. **Token Contract** - Sign and broadcast first
2. **Timelock Contract** - Sign and broadcast second  
3. **Governor Contract** - Update with real addresses, then sign and broadcast

⚠️ **Critical**: Governor transaction must be updated with actual token and timelock addresses!

## Step 5: Verify Deployment

Check your deployment status:

\`\`\`json
{
  "contractAddress": "0x...",
  "networkName": "sepolia",
  "includeTransactionDetails": true
}
\`\`\`

**Tool**: \`get-deployment-info\`

## Architecture Benefits

✅ **Security**: Hardware wallet keys never leave the device
✅ **Separation**: DAO logic separate from signing logic
✅ **Flexibility**: Use any compatible signing method
✅ **Maintainability**: Single codebase for each concern

## Next Steps

1. Set up token distribution
2. Create governance proposals
3. Engage your community
4. Consider moving to mainnet

## Need Help?

- List available networks: Use \`list-networks\` tool
- Check transaction status: Use \`wait-for-confirmation\` tool
- Network requirements: \`dao-deployer://docs/network-requirements\`
- Two-server setup: \`dao-deployer://docs/hardware-wallets\`
`;
}

/**
 * Get hardware wallet guide
 */
async function getHardwareWalletGuide(): Promise<string> {
  return `# 🔐 Two-Server Hardware Wallet Integration Guide

## Architecture Overview

This DAO Deployer uses a **two-server architecture** for maximum security:

1. **DAO Deployer MCP Server** (this one)
   - Prepares deployment transactions
   - Validates parameters and estimates gas
   - Provides deployment instructions

2. **MCP Ledger Server** (separate repository)
   - Handles hardware wallet connections
   - Signs transactions securely
   - Broadcasts to blockchain networks

## Why Two Servers?

✅ **Security**: Hardware wallet logic is isolated
✅ **Maintainability**: Single responsibility per server
✅ **Flexibility**: Use any compatible signing method
✅ **Upgradability**: Update servers independently

## Setup Process

### 1. Install Both MCP Servers

**DAO Deployer MCP Server** (you have this one)
\`\`\`bash
# Already running - prepares transactions
\`\`\`

**MCP Ledger Server** (install separately)
\`\`\`bash
git clone https://github.com/crazyrabbitLTC/mcp-ledger-server
cd mcp-ledger-server
npm install
\`\`\`

### 2. Configure Claude Code

Add both servers to your Claude Code configuration:

\`\`\`json
{
  "mcpServers": {
    "dao-deployer": {
      "command": "node",
      "args": ["/path/to/dao-deployer/build/index.js"]
    },
    "ledger": {
      "command": "node", 
      "args": ["/path/to/mcp-ledger-server/build/index.js"]
    }
  }
}
\`\`\`

### 3. Hardware Wallet Setup

**Connect Hardware Wallet** (via MCP Ledger Server)
- Connect Ledger device via USB
- Unlock device with PIN
- Open Ethereum app on device
- Verify connection using MCP Ledger server tools

## Workflow

### 1. Prepare Transaction (DAO Deployer)
\`\`\`json
{
  "tool": "prepare-factory-deployment",
  "networkName": "sepolia",
  "factoryVersion": "v2"
}
\`\`\`

### 2. Sign Transaction (MCP Ledger Server)
\`\`\`json
{
  "tool": "sign_transaction",
  "unsigned_transaction": "...",
  "network": "sepolia"
}
\`\`\`

### 3. Broadcast (MCP Ledger Server)
\`\`\`json
{
  "tool": "broadcast_transaction", 
  "signed_transaction": "...",
  "network": "sepolia"
}
\`\`\`

### 4. Monitor (DAO Deployer)
\`\`\`json
{
  "tool": "wait-for-confirmation",
  "transactionHash": "0x...",
  "networkName": "sepolia"
}
\`\`\`

## Security Features

### Hardware Wallet Security (MCP Ledger Server)
- Private keys never leave hardware device
- Transaction details displayed on device screen
- Physical confirmation required for every transaction
- Support for multiple hardware wallet types

### Transaction Verification
- All transaction parameters visible before signing
- Gas estimates and costs calculated
- Network validation prevents wrong-chain deployments
- Address validation prevents typos

## Supported Hardware Wallets

The MCP Ledger Server supports:
- **Ledger**: Nano S, Nano S Plus, Nano X
- **Future**: Trezor support planned

## Benefits of This Architecture

### Compared to Direct Integration:
✅ **Better Security**: Isolated hardware wallet handling
✅ **Easier Maintenance**: Update servers independently  
✅ **More Flexible**: Swap signing methods easily
✅ **Cleaner Code**: Single responsibility principle
✅ **Better Testing**: Mock signing for development

### Compared to CLI Tools:
✅ **Better UX**: Integrated with Claude Code
✅ **More Guidance**: Step-by-step instructions
✅ **Error Handling**: Better error messages and recovery
✅ **State Management**: Track deployment progress

## Troubleshooting

### Setup Issues
- Ensure both MCP servers are running
- Check Claude Code configuration
- Verify network connectivity
- Test each server independently

### Hardware Wallet Issues
- Use MCP Ledger server diagnostic tools
- Verify device connection and app status
- Check for firmware updates
- Refer to MCP Ledger server documentation

### Transaction Issues
- Verify transaction data with MCP Ledger server
- Check gas estimates and balances
- Use smaller test transactions first
- Monitor transaction status with both servers

## Getting Help

- **DAO Deployer Issues**: This server's documentation
- **Hardware Wallet Issues**: MCP Ledger server repository
- **Integration Issues**: Check both server configurations
- **Network Issues**: Use diagnostic tools from both servers

This two-server approach provides enterprise-grade security while maintaining ease of use!
`;
}

/**
 * Get network requirements guide
 */
async function getNetworkRequirementsGuide(): Promise<string> {
  return `# 🌍 Network Requirements Guide

## Network Categories

### 🌟 Mainnet Networks
High-value, production deployments with real economic value.

| Network | Requirements | Estimated Cost | Notes |
|---------|-------------|----------------|-------|
| Ethereum | High gas fees | $50-200 | Most secure, highest cost |
| Polygon | Medium gas fees | $1-5 | Fast, cheap alternative |
| Arbitrum | Low gas fees | $5-20 | L2 scaling solution |
| Optimism | Low gas fees | $5-20 | L2 scaling solution |
| Base | Low gas fees | $5-20 | Coinbase L2 |

### 🧪 Testnet Networks  
Free testing environments for development and testing.

| Network | Faucet Required | Speed | Notes |
|---------|----------------|--------|-------|
| Sepolia | Yes | Fast | Primary Ethereum testnet |
| Mumbai | Yes | Fast | Polygon testnet (deprecated) |
| Holesky | Yes | Medium | Ethereum consensus testnet |

## Prerequisites by Network

### All Networks
- **Foundry**: Latest version installed
- **Hardware Wallet**: Ledger/Trezor (recommended)
- **RPC Access**: Alchemy/Infura API key recommended

### Ethereum Mainnet
- **Balance**: Minimum 0.1 ETH for deployment
- **Gas Strategy**: Use 1.2-1.5x gas multiplier
- **Verification**: Etherscan API key required

### Layer 2 Networks (Arbitrum, Optimism, Base)
- **Bridge ETH**: Move ETH to L2 first
- **Lower Gas**: 1.1x multiplier usually sufficient
- **Fast Finality**: Deployments complete quickly

### Polygon
- **MATIC Balance**: Need MATIC for gas fees
- **Bridge Setup**: Bridge ETH/MATIC from Ethereum
- **API Keys**: Polygonscan API key for verification

## Environment Variables

Set these in your environment:

\`\`\`bash
# RPC Access
export ALCHEMY_API_KEY="your_alchemy_key"
export INFURA_API_KEY="your_infura_key"

# Block Explorer APIs (for verification)
export ETHERSCAN_API_KEY="your_etherscan_key"
export POLYGONSCAN_API_KEY="your_polygonscan_key"  
export ARBISCAN_API_KEY="your_arbiscan_key"
export OPTIMISTIC_ETHERSCAN_API_KEY="your_optimism_key"
export BASESCAN_API_KEY="your_basescan_key"
\`\`\`

## Gas Fee Considerations

### Ethereum Mainnet
- **Peak Times**: Avoid 9 AM - 5 PM EST
- **Gas Price**: Monitor via ethgasstation.info
- **Strategy**: Use EIP-1559 with proper fee estimation

### Layer 2 Networks
- **Consistent Fees**: More predictable than mainnet
- **Lower Risk**: Failed transactions cost less
- **Faster Confirmations**: Usually < 30 seconds

## Network Selection Guide

### For Development
1. **Sepolia** - Primary testing
2. **Holesky** - Secondary testing
3. **Local Anvil** - Local development

### For Production
1. **Ethereum** - Maximum security & decentralization
2. **Polygon** - Cost-effective alternative
3. **Arbitrum/Optimism** - L2 benefits with Ethereum security

### For Specific Use Cases
- **High-value DAOs**: Ethereum mainnet
- **Community DAOs**: Polygon or Base
- **Experimental DAOs**: Arbitrum or Optimism

## Pre-deployment Checklist

### ✅ Network Preparation
- [ ] RPC endpoint configured
- [ ] Sufficient native token balance
- [ ] Block explorer API key (for verification)
- [ ] Hardware wallet connected

### ✅ Contract Preparation  
- [ ] Contracts compiled successfully
- [ ] Constructor parameters validated
- [ ] Gas estimates calculated
- [ ] Deployment scripts tested

### ✅ Security Review
- [ ] Contract addresses double-checked
- [ ] Permission settings verified
- [ ] Timelock parameters configured
- [ ] Recovery mechanisms in place

## Post-deployment Actions

1. **Verify Contracts** - Submit source code to block explorer
2. **Document Addresses** - Save all deployed contract addresses
3. **Set Up Monitoring** - Track contract activity
4. **Community Announcement** - Share deployment details

## Troubleshooting

### RPC Issues
- Try different RPC endpoints
- Check API key limits
- Verify network connectivity

### Gas Issues
- Increase gas multiplier
- Wait for lower network congestion
- Use different time of day

### Verification Issues
- Check API key validity
- Ensure correct compiler version
- Verify constructor arguments match
`;
}