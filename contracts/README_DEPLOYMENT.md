# Deterministic Deployment Guide

## Overview

This guide explains how to deploy the DAO Factory system with deterministic addresses across all networks using CREATE2.

## Key Features

- **Deterministic Addresses**: Same contract addresses across all networks
- **Cross-Chain Compatibility**: Deploy on any EVM-compatible network
- **Version Management**: Different salts for different versions
- **Address Prediction**: Know addresses before deployment

## Quick Start

### 1. Environment Setup

```bash
# Copy and configure environment variables
cp .env.example .env

# Edit .env with your private key and RPC URLs
nano .env
```

### 2. Predict Addresses

```bash
# See what addresses will be deployed
forge script script/AddressPredictor.s.sol:AddressPredictor

# Or predict for specific deployer/network
forge script script/AddressPredictor.s.sol:AddressPredictor \
  --sig "predictForNetworks(address,bytes32)" \
  0xYourDeployerAddress \
  0xe4f99f2c04d8a6b077e526bdf1733446253de870519cc9e8a66dd83673d18a0d
```

### 3. Deploy to Network

```bash
# Deploy to Ethereum Sepolia (testnet)
forge script script/DeterministicDeploy.s.sol:DeterministicDeploy \
  --rpc-url $RPC_URL_ETHEREUM_SEPOLIA \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Deploy to Ethereum Mainnet
forge script script/DeterministicDeploy.s.sol:DeterministicDeploy \
  --rpc-url $RPC_URL_ETHEREUM_MAINNET \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

## Supported Networks

### Mainnets
- Ethereum (Chain ID: 1)
- Polygon (Chain ID: 137)
- Arbitrum One (Chain ID: 42161)
- Optimism (Chain ID: 10)
- Base (Chain ID: 8453)

### Testnets
- Ethereum Sepolia (Chain ID: 11155111)
- Polygon Mumbai (Chain ID: 80001)
- Arbitrum Sepolia (Chain ID: 421614)
- Optimism Sepolia (Chain ID: 11155420)
- Base Sepolia (Chain ID: 84532)

## Expected Addresses

With deployer `0x1234567890123456789012345678901234567890` and current salt:

```
Token Implementation:    0x38Be3354ad27fbf3C627A720900f8985Ee3c1AD0
Governor Implementation: 0x03C31606Ea2796b10214f4b4659987f3C1B8f922
Timelock Implementation: 0x02EcF7ec20253b607B938DC10e432AdBcf2487bD
Factory:                 0x5F326A934Fb1777191F8878ba721897Bc2f46FDb
```

**Note**: These addresses will be the same across ALL networks when deployed by the same address.

## Deployment Configuration

### Salt Management

Current deployment salt: `keccak256("TallyDAOFactoryV2.1.0.0")`

To deploy a new version with different addresses:
1. Update `CURRENT_SALT` in `DeploymentConfig.sol`
2. Add new salt constant (e.g., `SALT_V1_0_1`)
3. Redeploy

### Gas Configuration

Each network has optimized gas settings in `DeploymentConfig.sol`:

- **Ethereum**: 20 gwei, 5M gas limit
- **Polygon**: 30 gwei, 5M gas limit  
- **Arbitrum**: 0.1 gwei, 10M gas limit
- **Optimism**: 0.001 gwei, 5M gas limit
- **Base**: 0.001 gwei, 5M gas limit

## Verification

After deployment, verify contracts on block explorers:

```bash
# Automatic verification during deployment
forge script script/DeterministicDeploy.s.sol:DeterministicDeploy \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## Security Considerations

1. **Private Key Security**: Use hardware wallets or secure key management
2. **Address Verification**: Always verify predicted vs actual addresses
3. **Network Validation**: Confirm you're deploying to the correct network
4. **Gas Price**: Monitor gas prices for cost-effective deployment

## Troubleshooting

### Address Mismatch
If deployed addresses don't match predictions:
- Verify the deployer address
- Check the salt value
- Ensure no prior nonce usage at the deployer address

### Transaction Failures
- Verify sufficient gas limit
- Check network connectivity
- Ensure adequate ETH balance for gas

### Verification Issues
- Confirm API keys are correct
- Check contract source code matches
- Verify constructor parameters

## Advanced Usage

### Custom Deployer
```bash
# Use a specific deployer address
DEPLOYER_ADDRESS=0xYourAddress forge script script/AddressPredictor.s.sol
```

### Different Salt
```bash
# Deploy with custom salt (modify DeploymentConfig.sol first)
forge script script/DeterministicDeploy.s.sol --broadcast
```

### Multiple Networks
Deploy to multiple networks in sequence to maintain same addresses:

```bash
# Deploy to all testnets first
networks=("sepolia" "mumbai" "arbitrum-sepolia" "optimism-sepolia" "base-sepolia")
for network in "${networks[@]}"; do
  forge script script/DeterministicDeploy.s.sol \
    --rpc-url "$(eval echo \$RPC_URL_${network^^})" \
    --private-key $PRIVATE_KEY \
    --broadcast
done
```

## Integration

### Frontend Integration

Use the deployed factory address to integrate with your frontend:

```javascript
// Same address across all networks
const FACTORY_ADDRESS = "0x5F326A934Fb1777191F8878ba721897Bc2f46FDb";

// Network-specific configuration
const config = {
  1: { name: "Ethereum", factory: FACTORY_ADDRESS },
  137: { name: "Polygon", factory: FACTORY_ADDRESS },
  42161: { name: "Arbitrum", factory: FACTORY_ADDRESS },
  // ... same address for all networks
};
```

### Smart Contract Integration

```solidity
import {SimpleDAOFactoryV2} from "./SimpleDAOFactoryV2.sol";

contract YourContract {
    SimpleDAOFactoryV2 constant factory = SimpleDAOFactoryV2(0x5F326A934Fb1777191F8878ba721897Bc2f46FDb);
    
    function deployDAO() external {
        // Use factory to deploy DAOs
    }
}
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review transaction logs
3. Verify environment configuration
4. Open an issue with deployment details