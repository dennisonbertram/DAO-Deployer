#!/bin/bash

# Local deployment script that handles the forge file permission issue
set -e

echo "Deploying contracts to local Anvil..."

# Run the forge deployment and capture output
OUTPUT=$(forge script script/LocalDeploy.s.sol:LocalDeploy --fork-url http://localhost:8545 --broadcast 2>&1)

# Check if deployment was successful
if [[ $? -eq 0 ]]; then
    echo "✅ Contract deployment successful!"
    
    # Extract contract addresses from output
    FACTORY=$(echo "$OUTPUT" | grep "Factory:" | tail -1 | awk '{print $2}')
    TOKEN_IMPL=$(echo "$OUTPUT" | grep "Token Implementation:" | tail -1 | awk '{print $3}')
    GOVERNOR_IMPL=$(echo "$OUTPUT" | grep "Governor Implementation:" | tail -1 | awk '{print $3}')
    TIMELOCK_IMPL=$(echo "$OUTPUT" | grep "Timelock Implementation:" | tail -1 | awk '{print $3}')
    
    # Get current timestamp and block
    TIMESTAMP=$(date +%s)
    
    # Create JSON file
    cat > local-contracts.json << EOF
{
  "chainId": 31337,
  "factory": "$FACTORY",
  "tokenImplementation": "$TOKEN_IMPL",
  "governorImplementation": "$GOVERNOR_IMPL",
  "timelockImplementation": "$TIMELOCK_IMPL",
  "deployedAt": $TIMESTAMP,
  "blockNumber": 1
}
EOF
    
    echo "📄 Contract addresses saved to local-contracts.json"
    echo ""
    echo "📋 Deployed Contracts:"
    echo "  Factory: $FACTORY"
    echo "  Token Implementation: $TOKEN_IMPL"
    echo "  Governor Implementation: $GOVERNOR_IMPL"
    echo "  Timelock Implementation: $TIMELOCK_IMPL"
    
else
    echo "❌ Contract deployment failed"
    echo "$OUTPUT"
    exit 1
fi