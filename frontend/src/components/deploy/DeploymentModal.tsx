'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Hash, decodeEventLog } from 'viem'
import { useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { Dialog, DialogBackdrop, DialogDescription, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { DAOConfig } from '@/types/deploy'
import { FACTORY_ABI } from '@/lib/contracts/abis'
import { useToast } from '@/hooks/use-toast'
import { chains } from '@/lib/wagmi'
import { Button } from '@/components/ui/button'

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
  const chainId = useChainId()
  const { toast } = useToast()
  const currentChainName = useMemo(() => chains.find(c => c.id === chainId)?.name || 'Unknown Network', [chainId])

  // Watch for transaction receipt
  const { 
    data: receipt, 
    isError: receiptError, 
    isLoading: isWaitingForReceipt,
    error: receiptErrorDetails
  } = useWaitForTransactionReceipt({
    hash: transactionHash,
    chainId,
    confirmations: 1,
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
      try {
        // Parse the DAODeployed event from transaction logs
        // receipt.logs is an array of log objects with data and topics (from wagmi's TransactionReceipt type)
        const daoDeployedEvent = receipt.logs.find((log) => {
          try {
            const decoded = decodeEventLog({
              abi: FACTORY_ABI,
              data: log.data,
              topics: log.topics as [] | [`0x${string}`, ...`0x${string}`[]],
            })
            return decoded.eventName === 'DAODeployed'
          } catch {
            return false
          }
        })

        if (!daoDeployedEvent) {
          throw new Error('DAODeployed event not found in transaction logs')
        }

        // Decode the event to extract deployed addresses
        const decoded = decodeEventLog({
          abi: FACTORY_ABI,
          data: daoDeployedEvent.data,
          topics: daoDeployedEvent.topics as [] | [`0x${string}`, ...`0x${string}`[]],
        })

        if (decoded.eventName !== 'DAODeployed') {
          throw new Error('Unexpected event type')
        }

        const deployedAddressesFromEvent: DeployedAddresses = {
          token: decoded.args.token,
          governor: decoded.args.governor,
          timelock: decoded.args.timelock,
        }

        setDeployedAddresses(deployedAddressesFromEvent)
        setDeploymentStep('success')

        // Call completion callback
        if (onComplete) {
          const deploymentData: DeploymentData = {
            config,
            transactionHash: transactionHash!,
            deployedAddresses: deployedAddressesFromEvent,
            deploymentTimestamp: Date.now(),
            networkName: currentChainName
          }
          onComplete(deploymentData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse deployment addresses from transaction logs')
        setDeploymentStep('error')
      }
    }
  }, [receipt, deploymentStep, config, transactionHash, onComplete, currentChainName])

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
      toast({
        title: 'Copied to clipboard',
        description: 'The information has been copied to your clipboard.',
      } as any)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard. Please try again.',
        variant: 'destructive',
      } as any)
    }
  }, [toast])

  const downloadDeploymentData = useCallback(() => {
    if (!deployedAddresses || !transactionHash) return

    const deploymentData: DeploymentData = {
      config,
      transactionHash,
      deployedAddresses,
      deploymentTimestamp: Date.now(),
      networkName: currentChainName
    }

    const dataStr = JSON.stringify(deploymentData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `${config.tokenName.replace(/\s+/g, '_').toLowerCase()}_deployment.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }, [config, transactionHash, deployedAddresses, currentChainName])

  const copyDeploymentInfo = useCallback(() => {
    if (!deployedAddresses || !transactionHash) return

    const deploymentText = `
DAO: ${config.tokenName}
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
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-[1px]" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md overflow-hidden rounded-lg border bg-card text-card-foreground shadow-xl">
                <div className="p-6">
                  <div className="text-center mb-6">
                    <DialogTitle className="text-xl font-semibold tracking-tight">
                      Deploying {config.tokenName}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-1">
                      Submitting your deployment to {currentChainName}. This may take a minute.
                    </DialogDescription>
                  </div>

                  {/* Progress Steps */}
                  <div className="space-y-4 mb-6">
                    {[
                      { key: 'preparing', label: 'Preparing deployment', description: 'Validating configuration and estimating gas' },
                      { key: 'submitting', label: 'Submitting transaction', description: 'Sending transaction to the network' },
                      { key: 'mining', label: 'Mining transaction', description: 'Waiting for confirmation' },
                      { key: 'success', label: 'Deployment complete', description: 'Your DAO is now live!' }
                    ].map((step) => {
                      const status = getStepStatus(step.key)
                      return (
                        <div key={step.key} className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            status === 'completed' ? 'bg-tally-green-2 text-tally-green-8' :
                            status === 'active' ? 'bg-primary/15 text-primary' :
                            status === 'error' ? 'bg-destructive/15 text-destructive' :
                            'bg-muted text-muted-foreground'
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
                              status === 'completed' || status === 'active' ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {step.label}
                            </p>
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Transaction Hash */}
                  {transactionHash && (
                    <div className="rounded-lg border bg-muted/40 p-4 mb-6">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">Transaction</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(transactionHash)}
                        >
                          Copy
                        </Button>
                      </div>
                      <p className="font-mono text-xs text-foreground/90 break-all mt-1">
                        {transactionHash}
                      </p>
                    </div>
                  )}

                  {/* Error State */}
                  {deploymentStep === 'error' && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 mb-6">
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium text-destructive">Deployment failed</h3>
                          <p className="text-sm text-muted-foreground mt-1 break-words">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Success State - Deployed Addresses */}
                  {deploymentStep === 'success' && deployedAddresses && (
                    <div className="rounded-lg border border-tally-green-3 bg-tally-green-1 p-4 mb-6">
                      <h3 className="text-sm font-medium text-tally-green-9 mb-3">Deployment successful</h3>
                      <div className="space-y-2 text-xs">
                        {Object.entries(deployedAddresses).map(([type, address]) => (
                          <div key={type} className="flex justify-between items-center gap-3">
                            <span className="text-tally-green-8 capitalize">{type}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-tally-green-10">{address.slice(0, 8)}...{address.slice(-6)}</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(address)}
                                className="h-7 px-2 text-tally-green-9 hover:text-tally-green-10"
                              >
                                Copy
                              </Button>
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
                        <Button type="button" onClick={copyDeploymentInfo} className="w-full">
                          Copy deployment info
                        </Button>
                        <Button type="button" variant="secondary" onClick={downloadDeploymentData} className="w-full">
                          Download deployment JSON
                        </Button>
                      </>
                    )}
                    
                    {(deploymentStep === 'success' || deploymentStep === 'error') && (
                      <Button type="button" variant="outline" onClick={onClose} className="w-full">
                        Close
                      </Button>
                    )}
                  </div>

                  {/* Cancel Button for ongoing deployment */}
                  {(deploymentStep === 'preparing' || deploymentStep === 'submitting') && (
                    <Button type="button" variant="ghost" onClick={onClose} className="w-full">
                      Cancel
                    </Button>
                  )}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
