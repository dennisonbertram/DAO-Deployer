#!/usr/bin/env node

/**
 * DAO Deployer MCP Server Entry Point
 * 
 * This is the main entry point for the DAO Deployer Model Context Protocol server.
 * It provides tools for deploying DAO factories and complete DAO systems to any
 * supported blockchain network using hardware wallets for secure key management.
 */

import { config } from 'dotenv';
import { createServer, startServer } from './server.js';
import process from 'process';

// Load environment variables
config();

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    console.error('📝 DEBUG: Starting main() function');
    // Create and start the MCP server
    console.error('📝 DEBUG: Calling startServer()');
    await startServer();
    console.error('📝 DEBUG: startServer() completed');

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.error(`\n=� Received ${signal}, shutting down gracefully...`);
      try {
        // Server graceful shutdown will happen automatically
        console.error(' Server stopped successfully');
        process.exit(0);
      } catch (error) {
        console.error('L Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Register signal handlers for graceful shutdown
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Handle uncaught exceptions and promise rejections
    process.on('uncaughtException', (error: Error) => {
      console.error('=� Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
      console.error('=� Unhandled Promise Rejection:', reason);
      process.exit(1);
    });

  } catch (error: any) {
    console.error('=� Failed to start DAO Deployer MCP Server:', error.message);
    process.exit(1);
  }
}

// Check if this module is being run directly  
if (import.meta.url.endsWith('index.js') && process.argv[1].endsWith('index.js')) {
  main().catch((error) => {
    console.error('=� Fatal error:', error);
    process.exit(1);
  });
}