#!/bin/bash

echo "🧪 Testing MCP Server..."

# Initialize message
INIT_MSG='{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}}'

# Tools list message  
TOOLS_MSG='{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}'

echo "📤 Sending initialize and tools/list messages..."

# Send both messages to server
(echo "$INIT_MSG"; echo "$TOOLS_MSG"; sleep 2) | node build/index.js