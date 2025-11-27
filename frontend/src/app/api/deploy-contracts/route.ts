// API endpoint for deploying smart contract system to any network
import { NextRequest, NextResponse } from 'next/server';
import { Address } from 'viem';
import {
  deploySmartContractSystem,
  estimateDeploymentGas,
  validateNetworkInfo,
  checkExistingDeployment,
  NetworkInfo,
} from '@/lib/contracts/deployment';

interface DeploymentRequest {
  networkInfo: NetworkInfo;
  deployerAddress: Address;
  deployerPrivateKey?: string; // Optional for server-side deployment
}

export async function POST(request: NextRequest) {
  try {
    const body: DeploymentRequest = await request.json();
    const { networkInfo, deployerAddress, deployerPrivateKey } = body;

    if (!networkInfo || !deployerAddress) {
      return NextResponse.json(
        { error: 'Network info and deployer address are required' },
        { status: 400 }
      );
    }

    // Validate network info
    if (!validateNetworkInfo(networkInfo)) {
      return NextResponse.json(
        { error: 'Invalid network info - missing required fields' },
        { status: 400 }
      );
    }

    // Validate that the network has a reasonable chain ID (avoid obvious test values)
    if (networkInfo.chainId <= 0 || networkInfo.chainId > 1000000) {
      return NextResponse.json(
        { error: 'Invalid chain ID - must be between 1 and 1,000,000' },
        { status: 400 }
      );
    }

    // For client-side deployment, return gas estimate and deployment plan
    if (!deployerPrivateKey) {
      try {
        const gasEstimate = await estimateDeploymentGas(networkInfo, deployerAddress);
        
        return NextResponse.json({
          requiresClientSigning: true,
          deploymentPlan: {
            contracts: ['tokenImplementation', 'governorImplementation', 'timelockImplementation', 'factory'],
            gasEstimate: gasEstimate.totalGasEstimate.toString(),
            estimatedCost: gasEstimate.estimatedCostEth,
            gasPrice: gasEstimate.gasPrice.toString(),
            networkInfo,
          },
          message: 'Please sign transactions in your wallet to deploy contracts'
        });
      } catch (error) {
        return NextResponse.json(
          { error: `Gas estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    // Check if contracts are already deployed
    const existingDeployment = await checkExistingDeployment(networkInfo);
    if (existingDeployment.isDeployed) {
      return NextResponse.json(
        { 
          error: 'Contracts already deployed on this network',
          existingAddresses: existingDeployment
        },
        { status: 409 }
      );
    }

    // Server-side deployment with private key
    const deploymentResult = await deploySmartContractSystem(
      networkInfo,
      deployerPrivateKey
    );

    // Format response
    const contractAddresses = {
      factory: deploymentResult.factory.contractAddress,
      tokenImplementation: deploymentResult.tokenImplementation.contractAddress,
      governorImplementation: deploymentResult.governorImplementation.contractAddress,
      timelockImplementation: deploymentResult.timelockImplementation.contractAddress,
    };

    // Convert BigInt values to strings for JSON serialization
    const deploymentInfo = {
      deployer: deploymentResult.deployer,
      timestamp: deploymentResult.timestamp,
      networkInfo: deploymentResult.networkInfo,
      contractAddresses,
      transactionHashes: {
        factory: deploymentResult.factory.transactionHash,
        tokenImplementation: deploymentResult.tokenImplementation.transactionHash,
        governorImplementation: deploymentResult.governorImplementation.transactionHash,
        timelockImplementation: deploymentResult.timelockImplementation.transactionHash,
      },
      gasUsed: {
        factory: deploymentResult.factory.gasUsed.toString(),
        tokenImplementation: deploymentResult.tokenImplementation.gasUsed.toString(),
        governorImplementation: deploymentResult.governorImplementation.gasUsed.toString(),
        timelockImplementation: deploymentResult.timelockImplementation.gasUsed.toString(),
      },
      blockNumbers: {
        factory: deploymentResult.factory.blockNumber.toString(),
        tokenImplementation: deploymentResult.tokenImplementation.blockNumber.toString(),
        governorImplementation: deploymentResult.governorImplementation.blockNumber.toString(),
        timelockImplementation: deploymentResult.timelockImplementation.blockNumber.toString(),
      },
    };

    return NextResponse.json({
      success: true,
      message: 'Smart contract system deployed successfully',
      transactionHash: deploymentResult.factory.transactionHash,
      contractAddresses,
      networkInfo,
      deploymentInfo,
    });

  } catch (error) {
    let errorMessage = 'Failed to deploy contracts';
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to RPC endpoint. Please check network configuration.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for deployment';
      } else if (error.message.includes('Chain ID mismatch')) {
        errorMessage = 'Network configuration mismatch. Please verify RPC URL and chain ID.';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get deployment status/info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');

    if (!chainId) {
      return NextResponse.json(
        { error: 'Chain ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would fetch this from a database
    // For now, return placeholder info
    return NextResponse.json({
      chainId: parseInt(chainId),
      isDeployed: false,
      deploymentInfo: null,
      message: 'No deployments found for this network'
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch deployment info',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}