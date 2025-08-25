import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import crypto from 'crypto';

// Simple in-memory lock registry for file operations
const fileLocks = new Map<string, Promise<void>>();

/**
 * Atomic file write utility to prevent corruption during concurrent access
 * Uses write-to-temp-and-rename pattern for atomic operations
 */
export class AtomicFileWriter {
  /**
   * Atomically write data to a file using temp file + rename strategy
   */
  static async writeFile(
    filePath: string, 
    data: string, 
    options: { mode?: number; encoding?: BufferEncoding } = {}
  ): Promise<void> {
    const { mode = 0o644, encoding = 'utf8' } = options;
    
    // Generate unique temp file name
    const tempSuffix = crypto.randomBytes(8).toString('hex');
    const tempPath = `${filePath}.tmp.${tempSuffix}`;
    
    try {
      // Ensure directory exists
      const dir = dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write to temp file first
      await fs.writeFile(tempPath, data, { mode, encoding });
      
      // Atomic rename (this is the critical atomic operation)
      await fs.rename(tempPath, filePath);
      
    } catch (error) {
      // Cleanup temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }
  
  /**
   * Atomically update a JSON file with retry logic for concurrent access
   */
  static async writeJSON(
    filePath: string,
    data: any,
    options: { mode?: number; retries?: number; retryDelay?: number } = {}
  ): Promise<void> {
    const { mode = 0o644, retries = 3, retryDelay = 50 } = options;
    
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const jsonData = JSON.stringify(data, null, 2);
        await this.writeFile(filePath, jsonData, { mode });
        return; // Success
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on the last attempt
        if (attempt < retries) {
          // Wait before retry with exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed to write JSON file after ${retries + 1} attempts: ${lastError?.message}`);
  }
  
  /**
   * Safely read and update a JSON file with proper file locking
   * Uses in-memory locks to serialize concurrent operations on the same file
   */
  static async updateJSON(
    filePath: string,
    updateFn: (current: any) => any,
    options: { mode?: number; retries?: number } = {}
  ): Promise<void> {
    const { mode = 0o644, retries = 3 } = options;
    
    // Normalize file path for lock key
    const lockKey = filePath;
    
    // Wait for any existing operation on this file to complete
    const existingLock = fileLocks.get(lockKey);
    if (existingLock) {
      await existingLock;
    }
    
    // Create a new lock for this operation
    let resolveLock: () => void;
    const lockPromise = new Promise<void>(resolve => {
      resolveLock = resolve;
    });
    fileLocks.set(lockKey, lockPromise);
    
    try {
      // Now we have exclusive access to this file
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // Read current data
          let currentData = {};
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            currentData = JSON.parse(content);
          } catch (error: any) {
            // File doesn't exist or is invalid - start with empty object
            if (error.code !== 'ENOENT') {
            }
          }
          
          // Apply update function
          const updatedData = updateFn(currentData);
          
          // Write atomically
          await this.writeJSON(filePath, updatedData, { mode, retries: 0 });
          return; // Success
          
        } catch (error: any) {
          if (attempt < retries) {
            // Wait before retry
            const delay = 100 * (attempt + 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw error;
        }
      }
    } finally {
      // Release the lock
      fileLocks.delete(lockKey);
      resolveLock!();
    }
  }
}