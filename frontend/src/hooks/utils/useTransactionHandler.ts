// Transaction handling utilities
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { Hash, TransactionReceipt } from 'viem';
import { TransactionState, ContractError } from '@/lib/contracts';

/**
 * Enhanced transaction handler with comprehensive state management
 */
export function useTransactionHandler() {
  const [txState, setTxState] = useState<TransactionState>({
    status: 'idle',
  });

  const handleTransaction = useCallback(
    async (txFunction: () => Promise<Hash>) => {
      try {
        setTxState({ status: 'pending' });
        const hash = await txFunction();
        setTxState({
          status: 'success',
          hash,
          confirmations: 0
        });
        return hash;
      } catch (error) {
        // Parse error into user-friendly message
        let errorMessage = 'Transaction failed';

        if (error instanceof Error) {
          const errMsg = error.message.toLowerCase();

          // User rejected the transaction
          if (errMsg.includes('user rejected') || errMsg.includes('user denied')) {
            errorMessage = 'Transaction was cancelled';
          }
          // Insufficient funds
          else if (errMsg.includes('insufficient funds') || errMsg.includes('insufficient balance')) {
            errorMessage = 'Insufficient funds to complete the transaction';
          }
          // Gas estimation failed
          else if (errMsg.includes('gas') && (errMsg.includes('estimate') || errMsg.includes('estimation'))) {
            errorMessage = 'Unable to estimate gas. The transaction may fail or the contract may have restrictions.';
          }
          // Network/RPC errors
          else if (errMsg.includes('network') || errMsg.includes('rpc') || errMsg.includes('connection')) {
            errorMessage = 'Network connection error. Please check your connection and try again.';
          }
          // Nonce too low
          else if (errMsg.includes('nonce')) {
            errorMessage = 'Transaction nonce error. Please try again.';
          }
          // Contract revert with reason
          else if (errMsg.includes('revert')) {
            const reasonMatch = error.message.match(/reason[:\s]+["']?([^"']+)["']?/i);
            if (reasonMatch && reasonMatch[1]) {
              errorMessage = `Transaction failed: ${reasonMatch[1]}`;
            } else {
              errorMessage = 'Transaction reverted. The operation was rejected by the contract.';
            }
          }
          // Default to original error message if no pattern matched
          else {
            errorMessage = error.message;
          }
        }

        setTxState({
          status: 'error',
          error: errorMessage
        });
        throw error;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setTxState({ status: 'idle' });
  }, []);

  return { 
    txState, 
    handleTransaction, 
    reset,
    isIdle: txState.status === 'idle',
    isPending: txState.status === 'pending',
    isSuccess: txState.status === 'success',
    isError: txState.status === 'error',
  };
}

/**
 * Hook for waiting for transaction receipt with enhanced error handling
 */
export function useTransactionWatcher(hash?: Hash) {
  const {
    data: receipt,
    isError,
    isLoading,
    error,
    isSuccess,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash,
    },
  });

  return {
    receipt,
    isLoading,
    isError,
    error,
    isSuccess,
    isConfirmed: !!receipt && receipt.status === 'success',
  };
}

/**
 * Hook for comprehensive transaction monitoring
 */
export function useTransactionMonitor(hash?: Hash) {
  const { receipt, isLoading, isError, error, isSuccess, isConfirmed } = useTransactionWatcher(hash);
  const publicClient = usePublicClient();
  const [gasUsed, setGasUsed] = useState<bigint>();
  const [transactionFee, setTransactionFee] = useState<bigint>();

  useEffect(() => {
    if (receipt && publicClient) {
      setGasUsed(receipt.gasUsed);
      
      // Calculate transaction fee
      if (receipt.effectiveGasPrice) {
        const fee = receipt.gasUsed * receipt.effectiveGasPrice;
        setTransactionFee(fee);
      }
    }
  }, [receipt, publicClient]);

  return {
    receipt,
    isLoading,
    isError,
    error,
    isSuccess,
    isConfirmed,
    gasUsed,
    transactionFee,
    blockNumber: receipt?.blockNumber,
    blockHash: receipt?.blockHash,
  };
}

/**
 * Hook for parsing contract errors into user-friendly messages
 */
export function useContractErrorHandler() {
  const parseError = useCallback((error: unknown): ContractError => {
    if (!error) {
      return {
        name: 'Unknown Error',
        message: 'An unknown error occurred',
      };
    }

    // Type guard to check if error is an object with expected properties
    if (typeof error !== 'object') {
      return {
        name: 'Unknown Error',
        message: String(error),
      };
    }

    const errorObj = error as Record<string, unknown>;

    // Handle different error types
    if (errorObj.name === 'ContractFunctionRevertedError') {
      return {
        name: String(errorObj.name),
        message: typeof errorObj.reason === 'string' ? errorObj.reason : 'Contract function reverted',
        code: typeof errorObj.code === 'string' ? errorObj.code : undefined,
        data: errorObj.data,
      };
    }

    if (errorObj.name === 'UserRejectedRequestError') {
      return {
        name: 'User Rejected',
        message: 'Transaction was rejected by the user',
      };
    }

    if (errorObj.name === 'InsufficientFundsError') {
      return {
        name: 'Insufficient Funds',
        message: 'Insufficient funds to complete the transaction',
      };
    }

    if (errorObj.name === 'GasEstimationError') {
      return {
        name: 'Gas Estimation Failed',
        message: 'Unable to estimate gas for this transaction',
      };
    }

    // Default error handling
    return {
      name: typeof errorObj.name === 'string' ? errorObj.name : 'Transaction Error',
      message: typeof errorObj.message === 'string' ? errorObj.message : 'Transaction failed',
      code: typeof errorObj.code === 'string' ? errorObj.code : undefined,
    };
  }, []);

  return { parseError };
}

/**
 * Hook for gas estimation with error handling
 */
export function useGasEstimation() {
  const [gasEstimate, setGasEstimate] = useState<bigint>();
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimationError, setEstimationError] = useState<string>();
  const publicClient = usePublicClient();

  const estimateGas = useCallback(
    async (params: {
      to: `0x${string}`;
      data?: `0x${string}`;
      value?: bigint;
      account?: `0x${string}`;
    }) => {
      if (!publicClient) return;

      setIsEstimating(true);
      setEstimationError(undefined);

      try {
        const estimate = await publicClient.estimateGas(params);
        // Add 10% buffer for gas estimation
        const bufferedEstimate = (estimate * BigInt(110)) / BigInt(100);
        setGasEstimate(bufferedEstimate);
        return bufferedEstimate;
      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Gas estimation failed';
        setEstimationError(errorMessage);
        throw error;
      } finally {
        setIsEstimating(false);
      }
    },
    [publicClient]
  );

  const reset = useCallback(() => {
    setGasEstimate(undefined);
    setEstimationError(undefined);
  }, []);

  return {
    gasEstimate,
    isEstimating,
    estimationError,
    estimateGas,
    reset,
  };
}

/**
 * Combined transaction management hook
 */
export function useTransactionManager() {
  const { txState, handleTransaction, reset: resetTx, ...txStates } = useTransactionHandler();
  const { gasEstimate, isEstimating, estimateGas, reset: resetGas } = useGasEstimation();
  const { parseError } = useContractErrorHandler();
  
  const transactionMonitor = useTransactionMonitor(
    txState.status === 'success' ? txState.hash as Hash : undefined
  );

  const reset = useCallback(() => {
    resetTx();
    resetGas();
  }, [resetTx, resetGas]);

  return {
    // Transaction state
    txState,
    ...txStates,
    
    // Gas estimation
    gasEstimate,
    isEstimating,
    estimateGas,
    
    // Transaction monitoring
    ...transactionMonitor,
    
    // Actions
    handleTransaction,
    reset,
    
    // Utilities
    parseError,
  };
}