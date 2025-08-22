'use client'

import { useState, useCallback, useEffect } from 'react'
import { Hash } from 'viem'
import { useWaitForTransactionReceipt } from 'wagmi'
import { DAOConfig, DeploymentStatus } from '@/types/deploy'

interface DeployedAddresses {
  token: string
  governor: string  
  timelock: string
}

interface DeploymentData {
  config: DAOConfig
  transactionHash: Hash
  deployedAddresses: DeployedAddresses
  deploymentTimestamp: number
  networkName: string
}

interface DeploymentModalProps {
  isOpen: boolean
  transactionHash?: Hash
  config: DAOConfig
  onClose: () => void
  onComplete?: (data: DeploymentData) => void
}

export default function DeploymentModal({ 
  isOpen, 
  transactionHash, 
  config, 
  onClose,
  onComplete 
}: DeploymentModalProps) {
  const [deploymentStep, setDeploymentStep] = useState<'preparing' | 'submitting' | 'mining' | 'success' | 'error'>('preparing')
  const [deployedAddresses, setDeployedAddresses] = useState<DeployedAddresses | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Watch for transaction receipt
  const { 
    data: receipt, 
    isError: receiptError, 
    isLoading: isWaitingForReceipt,
    error: receiptErrorDetails
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
    query: {
      enabled: !!transactionHash && deploymentStep === 'mining'
    }
  })

  // Update deployment step based on transaction status
  useEffect(() => {
    if (transactionHash && deploymentStep === 'preparing') {
      setDeploymentStep('submitting')
      setTimeout(() => setDeploymentStep('mining'), 1000)
    }
  }, [transactionHash, deploymentStep])

  // Handle successful transaction
  useEffect(() => {
    if (receipt && deploymentStep === 'mining') {
      // Parse deployment addresses from receipt logs
      // In a real implementation, you would parse the actual contract deployment logs
      const mockAddresses: DeployedAddresses = {
        token: `0x${receipt.transactionHash.slice(2, 42)}`,
        governor: `0x${receipt.transactionHash.slice(10, 50)}`, 
        timelock: `0x${receipt.transactionHash.slice(18, 58)}`
      }
      
      setDeployedAddresses(mockAddresses)
      setDeploymentStep('success')
      
      // Call completion callback
      if (onComplete) {
        const deploymentData: DeploymentData = {
          config,
          transactionHash: transactionHash!,
          deployedAddresses: mockAddresses,
          deploymentTimestamp: Date.now(),
          networkName: 'Local Network' // Could be dynamic based on current chain
        }
        onComplete(deploymentData)
      }
    }
  }, [receipt, deploymentStep, config, transactionHash, onComplete])

  // Handle transaction errors
  useEffect(() => {
    if (receiptError && receiptErrorDetails) {
      setError(receiptErrorDetails.message)
      setDeploymentStep('error')
    }
  }, [receiptError, receiptErrorDetails])

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }, [])

  const downloadDeploymentData = useCallback(() => {
    if (!deployedAddresses || !transactionHash) return

    const deploymentData: DeploymentData = {
      config,
      transactionHash,
      deployedAddresses,
      deploymentTimestamp: Date.now(),
      networkName: 'Local Network'
    }

    const dataStr = JSON.stringify(deploymentData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `${config.name.replace(/\s+/g, '_').toLowerCase()}_deployment.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }, [config, transactionHash, deployedAddresses])

  const copyDeploymentInfo = useCallback(() => {
    if (!deployedAddresses || !transactionHash) return

    const deploymentText = `
DAO: ${config.name}
Transaction: ${transactionHash}
Token Contract: ${deployedAddresses.token}
Governor Contract: ${deployedAddresses.governor}
Timelock Contract: ${deployedAddresses.timelock}
Deployed: ${new Date().toISOString()}
    `.trim()

    copyToClipboard(deploymentText)
  }, [config, transactionHash, deployedAddresses, copyToClipboard])

  if (!isOpen) return null

  const getStepStatus = (step: string) => {
    const currentStepIndex = ['preparing', 'submitting', 'mining', 'success'].indexOf(deploymentStep)
    const stepIndex = ['preparing', 'submitting', 'mining', 'success'].indexOf(step)
    
    if (deploymentStep === 'error') {
      return stepIndex <= 2 ? 'error' : 'pending'
    }
    
    if (stepIndex < currentStepIndex) return 'completed'
    if (stepIndex === currentStepIndex) return 'active'
    return 'pending'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Deploying {config.name}
          </h2>
          <p className="text-gray-600">
            Please wait while we deploy your DAO to the blockchain
          </p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4 mb-6">
          {[
            { key: 'preparing', label: 'Preparing deployment', description: 'Validating configuration and estimating gas' },
            { key: 'submitting', label: 'Submitting transaction', description: 'Sending transaction to the network' },
            { key: 'mining', label: 'Mining transaction', description: 'Waiting for blockchain confirmation' },
            { key: 'success', label: 'Deployment complete', description: 'Your DAO is now live!' }
          ].map((step) => {
            const status = getStepStatus(step.key)
            return (
              <div key={step.key} className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  status === 'completed' ? 'bg-green-100 text-green-600' :
                  status === 'active' ? 'bg-blue-100 text-blue-600' :
                  status === 'error' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {status === 'completed' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : status === 'active' ? (
                    <div className="w-3 h-3 bg-current rounded-full animate-pulse" />
                  ) : status === 'error' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <div className="w-3 h-3 bg-current rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    status === 'completed' || status === 'active' ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Transaction Hash */}
        {transactionHash && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Transaction Hash:</span>
              <button
                onClick={() => copyToClipboard(transactionHash)}
                className="text-blue-600 hover:text-blue-800 text-xs"
              >
                Copy
              </button>
            </div>
            <p className="font-mono text-xs text-gray-900 break-all mt-1">
              {transactionHash}
            </p>
          </div>
        )}

        {/* Error State */}
        {deploymentStep === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Deployment Failed</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success State - Deployed Addresses */}
        {deploymentStep === 'success' && deployedAddresses && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-green-800 mb-3">Deployment Successful!</h3>
            <div className="space-y-2 text-xs">
              {Object.entries(deployedAddresses).map(([type, address]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-green-700 capitalize">{type}:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-green-900">{address.slice(0, 8)}...{address.slice(-6)}</span>
                    <button
                      onClick={() => copyToClipboard(address)}
                      className="text-green-600 hover:text-green-800"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          {deploymentStep === 'success' && (
            <>
              <button
                onClick={copyDeploymentInfo}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Copy Deployment Info
              </button>
              <button
                onClick={downloadDeploymentData}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Download Deployment JSON
              </button>
            </>
          )}
          
          {(deploymentStep === 'success' || deploymentStep === 'error') && (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Close
            </button>
          )}
        </div>

        {/* Cancel Button for ongoing deployment */}
        {(deploymentStep === 'preparing' || deploymentStep === 'submitting') && (
          <button
            onClick={onClose}
            className="w-full mt-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}