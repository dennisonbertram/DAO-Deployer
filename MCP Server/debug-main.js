#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

async function createDebugServer() {
  console.error('📝 Creating debug server...');
  
  const server = new Server(
    {
      name: 'debug-dao-deployer',
      version: '1.0.0',
      description: 'Debug version of DAO deployer server'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Add tools list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error('📝 Handling tools/list request...');
    return {
      tools: [
        {
          name: 'list-networks',
          description: 'List all available blockchain networks',
          inputSchema: {
            type: 'object',
            properties: {
              format: {
                type: 'string',
                enum: ['table', 'json'],
                default: 'table',
                description: 'Output format for the network list'
              }
            }
          }
        }
      ]
    };
  });

  // Add call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    console.error('📝 Handling tool call:', request.params.name);
    const { name, arguments: args } = request.params;
    
    if (name === 'list-networks') {
      console.error('📝 Executing list-networks...');
      try {
        // Import and call the actual function
        const { listNetworks, formatNetworkList } = await import('./build/tools/list-networks.js');
        console.error('📝 Module imported, calling function...');
        
        const result = await listNetworks(args || {});
        console.error('📝 Function returned, formatting...');
        
        const format = args?.format || 'table';
        const summary = formatNetworkList(result, format);
        console.error('📝 Formatted result, returning...');
        
        return {
          content: [{
            type: 'text',
            text: summary
          }]
        };
      } catch (e) {
        console.error('❌ Error in list-networks:', e.message);
        throw e;
      }
    }
    
    throw new Error(`Unknown tool: ${name}`);
  });

  return server;
}

async function main() {
  console.error('📝 Starting debug server...');
  try {
    const server = await createDebugServer();
    console.error('📝 Server created, connecting transport...');
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('✅ Debug server started successfully');
  } catch (e) {
    console.error('❌ Error starting server:', e.message);
    console.error('Stack:', e.stack);
    process.exit(1);
  }
}

main();