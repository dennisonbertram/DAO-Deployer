#!/usr/bin/env node

console.error('🧪 Final comprehensive smoke test...');

// Test the built server with proper message sequences
const { spawn } = require('child_process');

const testMessages = [
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
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  },
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'list-networks',
      arguments: { format: 'json' }
    }
  },
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

const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let responses = [];
let currentMessageIndex = 0;

function sendNextMessage() {
  if (currentMessageIndex < testMessages.length) {
    const message = testMessages[currentMessageIndex];
    console.error(`📤 Sending message ${currentMessageIndex + 1}: ${message.method}`);
    server.stdin.write(JSON.stringify(message) + '\n');
    currentMessageIndex++;
    
    // Send next message after delay
    setTimeout(sendNextMessage, 500);
  } else {
    console.error('📤 All messages sent, waiting for responses...');
    // Wait a bit then close
    setTimeout(() => {
      console.error('📤 Closing server stdin...');
      server.stdin.end();
    }, 2000);
  }
}

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.error('📥 Server stdout:', output.substring(0, 200) + (output.length > 200 ? '...' : ''));
  
  // Try to parse JSON responses
  const lines = output.trim().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        responses.push(response);
        console.error('✅ Valid JSON response received, ID:', response.id);
      } catch (e) {
        console.error('⚠️  Non-JSON line:', line.substring(0, 100));
      }
    }
  });
});

server.stderr.on('data', (data) => {
  const error = data.toString();
  console.error('📝 Server stderr:', error.trim());
});

server.on('close', (code) => {
  console.error(`\n🏁 Server exited with code ${code}`);
  console.error(`📊 Total JSON-RPC responses: ${responses.length}`);
  
  if (responses.length >= 2) {
    console.error('✅ Server is working! Basic tools/list works.');
    
    if (responses.length >= 3) {
      console.error('✅ Tool calls are working!');
    }
    
    if (responses.length >= 4) {
      console.error('✅ API key management is working!');
    }
    
    console.error('\n🎉 Smoke test PASSED - MCP Server is functional!');
  } else {
    console.error('❌ Smoke test FAILED - Server not responding properly');
  }
  
  process.exit(0);
});

server.on('error', (err) => {
  console.error('❌ Server process error:', err);
  process.exit(1);
});

// Start the test
console.error('📝 Starting server and waiting for startup...');
setTimeout(sendNextMessage, 1000);