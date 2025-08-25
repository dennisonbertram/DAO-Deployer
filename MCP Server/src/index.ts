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
    // Create and start the MCP server
    await startServer();

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      try {
        // Server graceful shutdown will happen automatically
        process.exit(0);
      } catch (error) {
        process.exit(1);
      }
    };

    // Register signal handlers for graceful shutdown
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Handle uncaught exceptions and promise rejections
    process.on('uncaughtException', (error: Error) => {
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
      process.exit(1);
    });

  } catch (error: any) {
    process.exit(1);
  }
}

// Check if this module is being run directly  
if (import.meta.url.endsWith('index.js') && process.argv[1].endsWith('index.js')) {
  main().catch((error) => {
    process.exit(1);
  });
}