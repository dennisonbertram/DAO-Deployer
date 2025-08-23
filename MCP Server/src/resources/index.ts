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
    useHardwareWallet: true,
    hardwareWalletType: "ledger",
    gasEstimateMultiplier: 1.2,
    description: "Template for deploying DAO factory contracts",
    examples: {
      testnet: {
        networkName: "sepolia",
        factoryVersion: "v2",
        verifyContract: true,
        useHardwareWallet: false
      },
      mainnet: {
        networkName: "ethereum",
        factoryVersion: "v2", 
        verifyContract: true,
        useHardwareWallet: true,
        hardwareWalletType: "ledger",
        gasEstimateMultiplier: 1.2
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
    useHardwareWallet: true,
    hardwareWalletType: "ledger",
    verifyContracts: true,
    description: "Template for deploying complete DAO systems",
    notes: {
      initialSupply: "Token supply in wei (18 decimals)",
      votingDelay: "Blocks to wait before voting starts", 
      votingPeriod: "Blocks for voting duration",
      proposalThreshold: "Min tokens needed to create proposal (in wei)",
      quorumPercentage: "Minimum % of tokens needed for quorum",
      minDelay: "Timelock delay in seconds (86400 = 1 day)"
    }
  };
  
  return JSON.stringify(template, null, 2);
}

/**
 * Get quick start guide
 */
async function getQuickStartGuide(): Promise<string> {
  return `# 🚀 DAO Deployer Quick Start Guide

## Prerequisites

1. **Hardware Wallet** (Recommended)
   - Ledger or Trezor device
   - Connected and unlocked
   - Ethereum app installed

2. **Environment Setup**
   - Node.js 18+
   - Foundry installed
   - API keys for block explorers (optional, for verification)

## Step 1: Deploy Factory Contract

First, deploy a factory contract to create DAOs:

\`\`\`bash
# Use the deploy-factory tool
{
  "networkName": "sepolia",
  "factoryVersion": "v2", 
  "verifyContract": true,
  "useHardwareWallet": true,
  "hardwareWalletType": "ledger"
}
\`\`\`

## Step 2: Deploy Your DAO

Once you have a factory address, deploy your DAO:

\`\`\`bash
# Use the deploy-dao tool
{
  "networkName": "sepolia",
  "factoryAddress": "0x...", # From step 1
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

## Step 3: Verify Deployment

Check your deployment status:

\`\`\`bash
# Use get-deployment-info tool
{
  "contractAddress": "0x...", # Governor address
  "networkName": "sepolia",
  "includeTransactionDetails": true
}
\`\`\`

## Next Steps

1. Set up token distribution
2. Create governance proposals
3. Engage your community
4. Consider moving to mainnet

## Need Help?

- Check network requirements: \`dao-deployer://docs/network-requirements\`
- Hardware wallet setup: \`dao-deployer://docs/hardware-wallets\`
- List available networks: Use the \`list-networks\` tool
`;
}

/**
 * Get hardware wallet guide
 */
async function getHardwareWalletGuide(): Promise<string> {
  return `# 🔐 Hardware Wallet Integration Guide

## Supported Hardware Wallets

### Ledger
- **Models**: Nano S, Nano S Plus, Nano X
- **Requirements**: Ethereum app installed and updated
- **Connection**: USB connection required

### Trezor  
- **Models**: Model One, Model T
- **Requirements**: Latest firmware
- **Connection**: USB connection required

## Setup Process

### 1. Connect Hardware Wallet
\`\`\`bash
# Connect your device and unlock it
# Open the Ethereum app on your device
\`\`\`

### 2. Configure Foundry
\`\`\`bash
# Foundry will automatically detect your hardware wallet
# Use --ledger or --trezor flags in deployment commands
\`\`\`

### 3. Deployment Flow
1. Run deployment command with hardware wallet flag
2. Foundry prepares the transaction
3. Hardware wallet displays transaction details
4. Confirm transaction on device
5. Transaction is broadcast to network

## Security Best Practices

### ✅ Do
- Always verify transaction details on device screen
- Keep firmware updated
- Use official apps only
- Double-check addresses and amounts

### ❌ Don't
- Never share your 24-word recovery phrase
- Don't use unofficial software
- Don't confirm transactions you don't understand
- Don't leave device unattended while unlocked

## Troubleshooting

### Connection Issues
- Ensure device is unlocked
- Try different USB cable/port
- Close other wallet applications
- Restart Foundry/terminal

### Transaction Failures
- Check device battery level
- Verify network connectivity
- Ensure sufficient balance for gas fees
- Try reducing gas limit if transaction fails

### Common Errors

**"Hardware wallet not detected"**
- Solution: Reconnect device, ensure app is open

**"Transaction rejected by user"**  
- Solution: Approve transaction on hardware wallet

**"Insufficient funds"**
- Solution: Add more ETH for gas fees

## Network-Specific Considerations

### Mainnet Deployment
- Double-check all parameters
- Start with small test transactions
- Use higher gas multipliers for reliability
- Consider deployment during low-traffic periods

### Testnet Deployment
- Use testnet ETH from faucets
- Lower gas settings acceptable
- Good for testing flows before mainnet

## Support

If you encounter issues:
1. Check Foundry documentation
2. Verify hardware wallet compatibility
3. Test with simple transactions first
4. Contact hardware wallet support if device issues persist
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