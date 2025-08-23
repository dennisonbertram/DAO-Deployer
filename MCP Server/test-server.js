#!/usr/bin/env node

import { spawn } from 'child_process';

// Test messages
const messages = [
  // Initialize
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  },
  // List tools
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  },
  // List networks
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'list-networks',
      arguments: {}
    }
  },
  // List API keys
  {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'list-api-keys',
      arguments: {}
    }
  }
];

console.log('🧪 Starting MCP Server Smoke Test...\n');

const server = spawn('node', ['build/index.js'], { 
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let messageIndex = 0;
let responses = [];

// Send messages with delay
function sendNextMessage() {
  if (messageIndex < messages.length) {
    const message = messages[messageIndex];
    console.log(`📤 Sending message ${messageIndex + 1}:`, JSON.stringify(message, null, 2));
    server.stdin.write(JSON.stringify(message) + '\n');
    messageIndex++;
    
    // Send next message after delay
    setTimeout(sendNextMessage, 1000);
  } else {
    // All messages sent, wait a bit then close
    setTimeout(() => {
      server.kill();
    }, 2000);
  }
}

server.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output) {
    console.log('📥 Server response:');
    try {
      const parsed = JSON.parse(output);
      console.log(JSON.stringify(parsed, null, 2));
      responses.push(parsed);
    } catch (e) {
      console.log('Raw output:', output);
    }
    console.log('---\n');
  }
});

server.stderr.on('data', (data) => {
  const error = data.toString().trim();
  if (error) {
    console.log('📝 Server log:', error);
  }
});

server.on('close', (code) => {
  console.log(`\n🏁 Server process exited with code ${code}`);
  console.log(`📊 Total responses received: ${responses.length}`);
  
  if (responses.length > 0) {
    console.log('✅ Server is responding to requests');
  } else {
    console.log('❌ No responses received from server');
  }
  
  process.exit(0);
});

server.on('error', (err) => {
  console.log('❌ Server error:', err);
  process.exit(1);
});

// Start the test
setTimeout(sendNextMessage, 500);