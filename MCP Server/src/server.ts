import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// Import tool implementations
import { 
  prepareFactoryDeployment, 
  DeployFactoryInputSchema, 
  generateFactoryDeploymentInstructions,
  getFactoryDeploymentSummary
} from './tools/deploy-factory.js';
import { 
  prepareDAODeploymentPlan, 
  DeployDAOInputSchema, 
  generateDAODeploymentInstructions,
  getDAODeploymentSummary,
  updateGovernorTransaction
} from './tools/deploy-dao.js';
import { 
  broadcastSignedTransaction,
  waitForConfirmation,
  checkTransactionStatus,
  BroadcastTransactionInputSchema,
  WaitForConfirmationInputSchema,
  CheckTransactionStatusInputSchema
} from './tools/broadcast-transaction.js';
import { listNetworks, formatNetworkList } from './tools/list-networks.js';
import { verifyContract, VerifyContractInputSchema, formatVerificationResults } from './tools/verify-contract.js';
import { getDeploymentInfo, GetDeploymentInfoInputSchema, formatDeploymentInfo } from './tools/deployment-info.js';
import { 
  setAPIKeyTool, 
  removeAPIKeyTool, 
  setMultipleAPIKeysTool, 
  listAPIKeysTool, 
  importAPIKeysFromEnvTool, 
  resetAPIKeysTool, 
  getConfigInfoTool,
  formatAPIKeyResult,
  SetAPIKeyInputSchema,
  RemoveAPIKeyInputSchema,
  SetMultipleAPIKeysInputSchema
} from './tools/manage-api-keys.js';
import {
  generateEphemeralWalletTool,
  listEphemeralWalletsTool,
  checkWalletBalanceTool,
  sweepEphemeralWalletTool,
  deleteEphemeralWalletTool,
  formatEphemeralWalletResult,
  GenerateEphemeralWalletInputSchema,
  CheckWalletBalanceInputSchema,
  SweepEphemeralWalletInputSchema,
  DeleteEphemeralWalletInputSchema
} from './tools/manage-ephemeral-wallets.js';

// Import resource implementations
import { listResources, readResource } from './resources/index.js';

/**
 * Create and configure the DAO Deployer MCP server
 */

export async function createServer(): Promise<Server> {
  const server = new Server(
    {
      name: 'dao-deployer-mcp-server',
      version: '1.0.0',
      description: 'Model Context Protocol server for preparing DAO deployment transactions with external signing support'
    },
    {
      capabilities: {
        resources: {},
        tools: {}
      }
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'prepare-factory-deployment',
          description: 'Prepare a DAO factory deployment transaction for external signing (use with MCP Ledger server)',
          inputSchema: {
            type: 'object',
            properties: {
              networkName: {
                type: 'string',
                description: 'Name of the blockchain network to deploy to (e.g., "ethereum", "polygon", "sepolia")'
              },
              factoryVersion: {
                type: 'string',
                enum: ['v1', 'v2'],
                default: 'v2',
                description: 'Version of the DAO factory contract to deploy'
              },
              verifyContract: {
                type: 'boolean',
                default: true,
                description: 'Whether to verify the contract on the block explorer'
              },
              gasEstimateMultiplier: {
                type: 'number',
                default: 1.2,
                description: 'Multiplier for gas estimate (e.g., 1.2 = 120% of estimated gas)'
              },
              fromAddress: {
                type: 'string',
                description: 'Address to deploy from (optional, used for gas estimation)'
              }
            },
            required: ['networkName']
          }
        },
        {
          name: 'prepare-dao-deployment',
          description: 'Prepare a complete DAO deployment plan with all three transactions (token, timelock, governor)',
          inputSchema: {
            type: 'object',
            properties: {
              networkName: {
                type: 'string',
                description: 'Name of the blockchain network to deploy to'
              },
              factoryAddress: {
                type: 'string',
                description: 'Address of the deployed DAO factory contract'
              },
              daoName: {
                type: 'string',
                description: 'Name of the DAO'
              },
              tokenName: {
                type: 'string',
                description: 'Name of the DAO governance token'
              },
              tokenSymbol: {
                type: 'string',
                description: 'Symbol of the DAO governance token'
              },
              initialSupply: {
                type: 'string',
                description: 'Initial token supply in wei (18 decimals)'
              },
              governorSettings: {
                type: 'object',
                properties: {
                  votingDelay: {
                    type: 'number',
                    description: 'Number of blocks to wait before voting starts on a proposal'
                  },
                  votingPeriod: {
                    type: 'number', 
                    description: 'Number of blocks that voting lasts for a proposal'
                  },
                  proposalThreshold: {
                    type: 'string',
                    description: 'Minimum number of tokens required to create a proposal (in wei)'
                  },
                  quorumPercentage: {
                    type: 'number',
                    description: 'Percentage of tokens required for quorum (1-100)'
                  }
                },
                required: ['votingDelay', 'votingPeriod', 'proposalThreshold', 'quorumPercentage']
              },
              timelockSettings: {
                type: 'object',
                properties: {
                  minDelay: {
                    type: 'number',
                    description: 'Minimum delay in seconds before proposal execution'
                  },
                  proposers: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of addresses that can propose to the timelock'
                  },
                  executors: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of addresses that can execute timelock proposals'
                  }
                },
                required: ['minDelay', 'proposers', 'executors']
              },
              verifyContracts: {
                type: 'boolean',
                default: true,
                description: 'Whether to verify all contracts on the block explorer'
              },
              fromAddress: {
                type: 'string',
                description: 'Address to deploy from (optional, used for gas estimation)'
              }
            },
            required: ['networkName', 'factoryAddress', 'daoName', 'tokenName', 'tokenSymbol', 'initialSupply', 'governorSettings', 'timelockSettings']
          }
        },
        {
          name: 'broadcast-signed-transaction',
          description: 'Broadcast a signed transaction to the blockchain and optionally wait for confirmation',
          inputSchema: {
            type: 'object',
            properties: {
              signedTransaction: {
                type: 'string',
                description: 'The signed transaction hash'
              },
              networkName: {
                type: 'string',
                description: 'Name of the blockchain network'
              },
              expectedTransactionHash: {
                type: 'string',
                description: 'Expected transaction hash (optional)'
              }
            },
            required: ['signedTransaction', 'networkName']
          }
        },
        {
          name: 'wait-for-confirmation',
          description: 'Wait for transaction confirmation on the blockchain',
          inputSchema: {
            type: 'object',
            properties: {
              transactionHash: {
                type: 'string',
                description: 'Transaction hash to wait for confirmation'
              },
              networkName: {
                type: 'string',
                description: 'Name of the blockchain network'
              },
              confirmations: {
                type: 'number',
                default: 1,
                description: 'Number of confirmations to wait for (1-20)'
              },
              timeoutMinutes: {
                type: 'number',
                default: 10,
                description: 'Timeout in minutes (1-30)'
              }
            },
            required: ['transactionHash', 'networkName']
          }
        },
        {
          name: 'check-transaction-status',
          description: 'Check the current status of a transaction',
          inputSchema: {
            type: 'object',
            properties: {
              transactionHash: {
                type: 'string',
                description: 'Transaction hash to check'
              },
              networkName: {
                type: 'string',
                description: 'Name of the blockchain network'
              }
            },
            required: ['transactionHash', 'networkName']
          }
        },
        {
          name: 'list-networks',
          description: 'List all supported blockchain networks and their configurations',
          inputSchema: {
            type: 'object',
            properties: {
              includeTestnets: {
                type: 'boolean',
                default: true,
                description: 'Whether to include testnet networks in the list'
              },
              includeMainnets: {
                type: 'boolean', 
                default: true,
                description: 'Whether to include mainnet networks in the list'
              }
            }
          }
        },
        {
          name: 'verify-contract',
          description: 'Verify a deployed contract on the block explorer',
          inputSchema: {
            type: 'object',
            properties: {
              contractAddress: {
                type: 'string',
                description: 'Address of the deployed contract to verify'
              },
              networkName: {
                type: 'string',
                description: 'Name of the blockchain network'
              },
              contractName: {
                type: 'string',
                description: 'Name of the contract (e.g., "SimpleDAOFactory")'
              },
              constructorArgs: {
                type: 'array',
                description: 'Constructor arguments used during deployment'
              },
              optimizationRuns: {
                type: 'number',
                default: 200,
                description: 'Number of optimization runs used during compilation'
              }
            },
            required: ['contractAddress', 'networkName', 'contractName']
          }
        },
        {
          name: 'get-deployment-info',
          description: 'Get detailed information about a deployed contract',
          inputSchema: {
            type: 'object',
            properties: {
              contractAddress: {
                type: 'string',
                description: 'Address of the deployed contract'
              },
              networkName: {
                type: 'string',
                description: 'Name of the blockchain network'
              },
              includeTransactionDetails: {
                type: 'boolean',
                default: false,
                description: 'Whether to include detailed transaction information'
              }
            },
            required: ['contractAddress', 'networkName']
          }
        },
        {
          name: 'set-api-key',
          description: 'Set an API key for blockchain services (stored securely)',
          inputSchema: {
            type: 'object',
            properties: {
              keyName: {
                type: 'string',
                enum: [
                  'ALCHEMY_API_KEY',
                  'INFURA_API_KEY',
                  'ETHERSCAN_API_KEY',
                  'POLYGONSCAN_API_KEY',
                  'ARBISCAN_API_KEY',
                  'OPTIMISTIC_ETHERSCAN_API_KEY',
                  'BASESCAN_API_KEY',
                  'SNOWTRACE_API_KEY',
                  'BSCSCAN_API_KEY'
                ],
                description: 'Name of the API key to set'
              },
              value: {
                type: 'string',
                description: 'The API key value'
              }
            },
            required: ['keyName', 'value']
          }
        },
        {
          name: 'remove-api-key',
          description: 'Remove a saved API key',
          inputSchema: {
            type: 'object',
            properties: {
              keyName: {
                type: 'string',
                enum: [
                  'ALCHEMY_API_KEY',
                  'INFURA_API_KEY',
                  'ETHERSCAN_API_KEY',
                  'POLYGONSCAN_API_KEY',
                  'ARBISCAN_API_KEY',
                  'OPTIMISTIC_ETHERSCAN_API_KEY',
                  'BASESCAN_API_KEY',
                  'SNOWTRACE_API_KEY',
                  'BSCSCAN_API_KEY'
                ],
                description: 'Name of the API key to remove'
              }
            },
            required: ['keyName']
          }
        },
        {
          name: 'list-api-keys',
          description: 'List all API key configuration status',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'generate-ephemeral-wallet',
          description: 'Generate a temporary wallet for deployment funding (test networks only)',
          inputSchema: {
            type: 'object',
            properties: {
              networkName: {
                type: 'string',
                description: 'Name of the blockchain network (must be testnet)'
              },
              walletName: {
                type: 'string',
                description: 'Optional name for the wallet'
              }
            },
            required: ['networkName']
          }
        },
        {
          name: 'list-ephemeral-wallets',
          description: 'List all generated ephemeral wallets',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'check-wallet-balance',
          description: 'Check the balance of a wallet address',
          inputSchema: {
            type: 'object',
            properties: {
              address: {
                type: 'string',
                description: 'Wallet address to check'
              },
              networkName: {
                type: 'string',
                description: 'Name of the blockchain network'
              }
            },
            required: ['address', 'networkName']
          }
        },
        {
          name: 'get-config-info',
          description: 'Get configuration information and API key status',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'prepare-factory-deployment': {
          const result = await prepareFactoryDeployment(args as any);
          const instructions = generateFactoryDeploymentInstructions(result, args as any);
          const summary = getFactoryDeploymentSummary(result, args as any);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
              },
              {
                type: 'text',
                text: '\n\n' + instructions
              }
            ]
          };
        }

        case 'prepare-dao-deployment': {
          const result = await prepareDAODeploymentPlan(args as any);
          const instructions = generateDAODeploymentInstructions(result);
          const summary = getDAODeploymentSummary(result);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
              },
              {
                type: 'text',
                text: '\n\n' + instructions
              }
            ]
          };
        }

        case 'broadcast-signed-transaction': {
          const result = await broadcastSignedTransaction(args as any);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'wait-for-confirmation': {
          const result = await waitForConfirmation(args as any);
          return {
            content: [
              {
                type: 'text',
                text: `✅ Transaction Confirmed!\n\n${JSON.stringify(result, null, 2)}`
              }
            ]
          };
        }

        case 'check-transaction-status': {
          const result = await checkTransactionStatus(args as any);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        }

        case 'list-networks': {
          const networks = await listNetworks(args as any);
          const format = (args as any)?.format || 'table';
          const formatted = formatNetworkList(networks, format);
          return {
            content: [
              {
                type: 'text',
                text: formatted
              }
            ]
          };
        }

        case 'verify-contract': {
          const result = await verifyContract(args as any);
          const formatted = formatVerificationResults([result]);
          return {
            content: [
              {
                type: 'text',
                text: formatted
              }
            ]
          };
        }

        case 'get-deployment-info': {
          const result = await getDeploymentInfo(args as any);
          const formatted = formatDeploymentInfo(result);
          return {
            content: [
              {
                type: 'text',
                text: formatted
              }
            ]
          };
        }

        case 'set-api-key': {
          const result = await setAPIKeyTool(args as any);
          const formatted = formatAPIKeyResult(result);
          return {
            content: [
              {
                type: 'text',
                text: formatted
              }
            ]
          };
        }

        case 'remove-api-key': {
          const result = await removeAPIKeyTool(args as any);
          const formatted = formatAPIKeyResult(result);
          return {
            content: [
              {
                type: 'text',
                text: formatted
              }
            ]
          };
        }

        case 'list-api-keys': {
          const result = await listAPIKeysTool();
          const formatted = formatAPIKeyResult(result);
          return {
            content: [
              {
                type: 'text',
                text: formatted
              }
            ]
          };
        }

        case 'generate-ephemeral-wallet': {
          const result = await generateEphemeralWalletTool(args as any);
          const formatted = formatEphemeralWalletResult(result);
          return {
            content: [
              {
                type: 'text',
                text: formatted
              }
            ]
          };
        }

        case 'list-ephemeral-wallets': {
          const result = await listEphemeralWalletsTool();
          const formatted = formatEphemeralWalletResult(result);
          return {
            content: [
              {
                type: 'text',
                text: formatted
              }
            ]
          };
        }

        case 'check-wallet-balance': {
          const result = await checkWalletBalanceTool(args as any);
          const formatted = formatEphemeralWalletResult(result);
          return {
            content: [
              {
                type: 'text',
                text: formatted
              }
            ]
          };
        }

        case 'get-config-info': {
          const result = await getConfigInfoTool();
          const formatted = formatAPIKeyResult(result);
          return {
            content: [
              {
                type: 'text',
                text: formatted
              }
            ]
          };
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      const errorName = error?.constructor?.name || 'Error';
      
      return {
        content: [
          {
            type: 'text',
            text: `❌ ${errorName}: ${errorMessage}`
          }
        ]
      };
    }
  });

  // List resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = await listResources();
    return { resources };
  });

  // Read resource content
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const content = await readResource(uri);
    
    return {
      contents: [
        {
          uri,
          mimeType: uri.includes('/abi/') ? 'application/json' : 
                    uri.includes('/source/') ? 'text/x-solidity' :
                    uri.includes('/docs/') ? 'text/markdown' : 
                    'application/json',
          text: content
        }
      ]
    };
  });

  return server;
}

/**
 * Start the server
 */
export async function startServer() {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Start server if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    process.exit(1);
  });
}