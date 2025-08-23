#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

async function testServer() {
  console.error('📝 Creating minimal test server...');
  
  const server = new Server(
    {
      name: 'test-server',
      version: '1.0.0',
      description: 'Minimal test server'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Add a simple handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error('📝 Handling tools/list request');
    return {
      tools: [
        {
          name: 'test-tool',
          description: 'A test tool',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      ]
    };
  });

  console.error('📝 Starting server with stdio transport...');
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ Server connected and running');
}

testServer().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});