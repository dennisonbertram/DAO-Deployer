/**
 * Integration test setup
 * Manages Anvil blockchain and MCP server processes
 */
import { spawn, ChildProcess } from 'child_process';
import { beforeAll, afterAll } from 'vitest';
import { waitFor } from './global-setup';

let anvilProcess: ChildProcess | null = null;
let mcpServerProcess: ChildProcess | null = null;

// Anvil test accounts (deterministic)
export const ANVIL_ACCOUNTS = [
  {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  },
  {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  },
  {
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  },
];

export const ANVIL_RPC_URL = 'http://localhost:8545';
export const ANVIL_CHAIN_ID = 31337;

/**
 * Start Anvil local blockchain
 */
export async function startAnvil(): Promise<ChildProcess> {
  console.log('Starting Anvil local blockchain...');
  
  const anvil = spawn('anvil', [
    '--port', '8545',
    '--accounts', '10',
    '--balance', '10000',
    '--gas-limit', '30000000',
    '--block-time', '1', // 1 second block time for faster tests
    '--chain-id', '31337',
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  // Wait for Anvil to be ready
  await waitFor(async () => {
    try {
      const response = await fetch(ANVIL_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, 10000);

  console.log('Anvil started successfully on port 8545');
  return anvil;
}

/**
 * Stop Anvil process
 */
export async function stopAnvil(process: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!process) {
      resolve();
      return;
    }

    process.on('exit', () => {
      console.log('Anvil stopped');
      resolve();
    });

    process.kill('SIGTERM');
    
    // Force kill after timeout
    setTimeout(() => {
      process.kill('SIGKILL');
      resolve();
    }, 5000);
  });
}

/**
 * Start MCP server process
 */
export async function startMCPServer(): Promise<ChildProcess> {
  console.log('Starting MCP server...');
  
  // Build the server first
  const { execSync } = await import('child_process');
  execSync('npm run build', { cwd: process.cwd() });
  
  const server = spawn('node', ['build/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DISABLE_HARDWARE_WALLET: 'true',
    },
  });

  // Give server time to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('MCP server started successfully');
  return server;
}

/**
 * Stop MCP server process
 */
export async function stopMCPServer(process: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!process) {
      resolve();
      return;
    }

    process.on('exit', () => {
      console.log('MCP server stopped');
      resolve();
    });

    process.kill('SIGTERM');
    
    // Force kill after timeout
    setTimeout(() => {
      process.kill('SIGKILL');
      resolve();
    }, 5000);
  });
}

// Integration test hooks
beforeAll(async () => {
  // Start Anvil for blockchain tests
  if (process.env.USE_ANVIL !== 'false') {
    anvilProcess = await startAnvil();
  }
  
  // Start MCP server for protocol tests
  if (process.env.USE_MCP_SERVER !== 'false') {
    mcpServerProcess = await startMCPServer();
  }
});

afterAll(async () => {
  // Stop all processes
  if (anvilProcess) {
    await stopAnvil(anvilProcess);
  }
  
  if (mcpServerProcess) {
    await stopMCPServer(mcpServerProcess);
  }
});

// Export processes for test access
export function getAnvilProcess(): ChildProcess | null {
  return anvilProcess;
}

export function getMCPServerProcess(): ChildProcess | null {
  return mcpServerProcess;
}