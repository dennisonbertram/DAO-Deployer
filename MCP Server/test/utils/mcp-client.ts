/**
 * MCP Protocol test client utilities
 * Provides functions to communicate with MCP server via JSON-RPC
 */
import { ChildProcess } from 'child_process';
import { Readable, Writable } from 'stream';

export interface MCPMessage {
  jsonrpc: '2.0';
  id: number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class MCPTestClient {
  private messageId = 0;
  private pendingMessages = new Map<number, {
    resolve: (value: MCPMessage) => void;
    reject: (error: Error) => void;
  }>();
  private buffer = '';

  constructor(
    private process: ChildProcess,
    private stdin: Writable = process.stdin!,
    private stdout: Readable = process.stdout!
  ) {
    this.setupListeners();
  }

  /**
   * Setup stdout listener to handle responses
   */
  private setupListeners() {
    this.stdout.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString();
      this.processBuffer();
    });

    this.process.on('error', (error) => {
      console.error('MCP process error:', error);
      this.rejectAllPending(error);
    });

    this.process.on('exit', (code) => {
      const error = new Error(`MCP process exited with code ${code}`);
      this.rejectAllPending(error);
    });
  }

  /**
   * Process buffer to extract complete JSON-RPC messages
   */
  private processBuffer() {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as MCPMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse MCP message:', line, error);
        }
      }
    }
  }

  /**
   * Handle incoming JSON-RPC message
   */
  private handleMessage(message: MCPMessage) {
    if (message.id !== undefined) {
      const pending = this.pendingMessages.get(message.id);
      if (pending) {
        this.pendingMessages.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message);
        }
      }
    }
  }

  /**
   * Reject all pending messages
   */
  private rejectAllPending(error: Error) {
    for (const pending of this.pendingMessages.values()) {
      pending.reject(error);
    }
    this.pendingMessages.clear();
  }

  /**
   * Send a JSON-RPC message and wait for response
   */
  async sendMessage(method: string, params?: any): Promise<MCPMessage> {
    const id = ++this.messageId;
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject });
      
      const messageStr = JSON.stringify(message) + '\n';
      this.stdin.write(messageStr, (error) => {
        if (error) {
          this.pendingMessages.delete(id);
          reject(error);
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error(`Timeout waiting for response to message ${id}`));
        }
      }, 30000);
    });
  }

  /**
   * Initialize MCP protocol
   */
  async initialize(clientInfo = { name: 'test-client', version: '1.0.0' }) {
    return this.sendMessage('initialize', {
      protocolVersion: '2025-06-18', // Use current protocol version
      capabilities: {},
      clientInfo,
    });
  }

  /**
   * List available tools
   */
  async listTools() {
    return this.sendMessage('tools/list');
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: any) {
    return this.sendMessage('tools/call', {
      name,
      arguments: args,
    });
  }

  /**
   * List available resources
   */
  async listResources() {
    return this.sendMessage('resources/list');
  }

  /**
   * Read a resource
   */
  async readResource(uri: string) {
    return this.sendMessage('resources/read', { uri });
  }

  /**
   * Close the client
   */
  async close() {
    this.stdin.end();
    this.stdout.destroy();
    this.rejectAllPending(new Error('Client closed'));
  }
}

/**
 * Create MCP test client from process
 */
export function createMCPClient(process: ChildProcess): MCPTestClient {
  return new MCPTestClient(process);
}

/**
 * Helper to extract text content from MCP response
 */
export function extractTextContent(response: MCPMessage): string {
  if (response.result?.content?.[0]?.text) {
    return response.result.content[0].text;
  }
  return '';
}

/**
 * Helper to extract tool names from list response
 */
export function extractToolNames(response: MCPMessage): string[] {
  if (response.result?.tools) {
    return response.result.tools.map((tool: any) => tool.name);
  }
  return [];
}

/**
 * Helper to validate tool schema
 */
export function validateToolSchema(tool: any): boolean {
  return (
    typeof tool.name === 'string' &&
    typeof tool.description === 'string' &&
    typeof tool.inputSchema === 'object'
  );
}