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
import { deployFactory, DeployFactoryInputSchema, formatFactoryDeploymentSummary } from './tools/deploy-factory.js';
import { deployDAO, DeployDAOInputSchema, formatDAODeploymentSummary } from './tools/deploy-dao.js';
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
      description: 'Model Context Protocol server for deploying DAO factories and DAOs to any network with hardware wallet support'
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
    console.error('📝 DEBUG: Handling tools/list request in main server');
    return {
      tools: [
        {
          name: 'deploy-factory',
          description: 'Deploy a DAO factory contract to any supported blockchain network using hardware wallet for secure key management',
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
              useHardwareWallet: {
                type: 'boolean',
                default: true,
                description: 'Whether to use a hardware wallet for deployment'
              },
              hardwareWalletType: {
                type: 'string',
                enum: ['ledger', 'trezor'],
                description: 'Type of hardware wallet to use (required if useHardwareWallet is true)'
              },
              gasEstimateMultiplier: {
                type: 'number',
                default: 1.2,
                description: 'Multiplier for gas estimate (e.g., 1.2 = 120% of estimated gas)'
              }
            },
            required: ['networkName']
          }
        },
        {
          name: 'deploy-dao',
          description: 'Deploy a complete DAO system (token, governor, timelock) to any supported blockchain network',
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
              useHardwareWallet: {
                type: 'boolean',
                default: true,
                description: 'Whether to use a hardware wallet for deployment'
              },
              hardwareWalletType: {
                type: 'string',
                enum: ['ledger', 'trezor'],
                description: 'Type of hardware wallet to use'
              },
              verifyContracts: {
                type: 'boolean',
                default: true,
                description: 'Whether to verify all contracts on the block explorer'
              }
            },
            required: ['networkName', 'factoryAddress', 'daoName', 'tokenName', 'tokenSymbol', 'initialSupply', 'governorSettings', 'timelockSettings']
          }
        },
        {
          name: 'list-networks',
          description: 'List all supported blockchain networks with their configuration details',
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
          description: 'Verify a deployed contract on its blockchain explorer',
          inputSchema: {
            type: 'object',
            properties: {
              contractAddress: {
                type: 'string',
                description: 'Address of the deployed contract to verify'
              },
              contractName: {
                type: 'string',
                description: 'Name of the contract (must match compiled contract name)'
              },
              networkName: {
                type: 'string',
                description: 'Name of the blockchain network where the contract is deployed'
              },
              constructorArgs: {
                type: 'array',
                items: { type: 'string' },
                default: [],
                description: 'Constructor arguments used when deploying the contract'
              }
            },
            required: ['contractAddress', 'contractName', 'networkName']
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
                description: 'Address of the contract to get information about'
              },
              networkName: {
                type: 'string',
                description: 'Name of the blockchain network where the contract is deployed'
              },
              includeABI: {
                type: 'boolean',
                default: false,
                description: 'Whether to include the contract ABI in the response'
              },
              includeTransactionDetails: {
                type: 'boolean',
                default: true,
                description: 'Whether to include deployment transaction details'
              },
              checkVerification: {
                type: 'boolean',
                default: true,
                description: 'Whether to check if the contract is verified on the explorer'
              }
            },
            required: ['contractAddress', 'networkName']
          }
        },
        {
          name: 'set-api-key',
          description: 'Set and save an API key for blockchain services (Alchemy, Etherscan, etc.)',
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
          name: 'set-multiple-api-keys',
          description: 'Set multiple API keys at once',
          inputSchema: {
            type: 'object',
            properties: {
              apiKeys: {
                type: 'object',
                additionalProperties: {
                  type: 'string'
                },
                description: 'Object with API key names as keys and API key values as values'
              }
            },
            required: ['apiKeys']
          }
        },
        {
          name: 'import-api-keys-from-env',
          description: 'Import API keys from environment variables and save them',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'reset-api-keys',
          description: 'Reset all API key configuration (creates backup first)',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'get-config-info',
          description: 'Get information about the API key configuration file',
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
        case 'deploy-factory': {
          console.log('<� Executing deploy-factory tool...');
          const validatedArgs = DeployFactoryInputSchema.parse(args);
          const result = await deployFactory(validatedArgs);
          const summary = formatFactoryDeploymentSummary(result);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
              }
            ]
          };
        }

        case 'deploy-dao': {
          console.log('<� Executing deploy-dao tool...');
          const validatedArgs = DeployDAOInputSchema.parse(args);
          const result = await deployDAO(validatedArgs);
          const summary = formatDAODeploymentSummary(result);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
              }
            ]
          };
        }

        case 'list-networks': {
          console.log('< Executing list-networks tool...');
          const result = await listNetworks(args as any);
          const format = (args as any)?.format || 'table';
          const summary = formatNetworkList(result, format);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
              }
            ]
          };
        }

        case 'verify-contract': {
          console.log(' Executing verify-contract tool...');
          const validatedArgs = VerifyContractInputSchema.parse(args);
          const result = await verifyContract(validatedArgs);
          const summary = formatVerificationResults([result]);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
              }
            ]
          };
        }

        case 'get-deployment-info': {
          console.log('=� Executing get-deployment-info tool...');
          const validatedArgs = GetDeploymentInfoInputSchema.parse(args);
          const result = await getDeploymentInfo(validatedArgs);
          const summary = formatDeploymentInfo(result);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
              }
            ]
          };
        }

        case 'set-api-key': {
          console.log('🔑 Executing set-api-key tool...');
          const validatedArgs = SetAPIKeyInputSchema.parse(args);
          const result = await setAPIKeyTool(validatedArgs);
          const summary = formatAPIKeyResult(result);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
              }
            ]
          };
        }

        case 'remove-api-key': {
          console.log('🗑️ Executing remove-api-key tool...');
          const validatedArgs = RemoveAPIKeyInputSchema.parse(args);
          const result = await removeAPIKeyTool(validatedArgs);
          const summary = formatAPIKeyResult(result);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
              }
            ]
          };
        }

        case 'list-api-keys': {
          console.log('📋 Executing list-api-keys tool...');
          const result = await listAPIKeysTool();
          const summary = formatAPIKeyResult(result);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
              }
            ]
          };
        }

        case 'set-multiple-api-keys': {
          console.log('🔑 Executing set-multiple-api-keys tool...');
          const validatedArgs = SetMultipleAPIKeysInputSchema.parse(args);
          const result = await setMultipleAPIKeysTool(validatedArgs);
          const summary = formatAPIKeyResult(result);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
              }
            ]
          };
        }

        case 'import-api-keys-from-env': {
          console.log('📥 Executing import-api-keys-from-env tool...');
          const result = await importAPIKeysFromEnvTool();
          const summary = formatAPIKeyResult(result);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
              }
            ]
          };
        }

        case 'reset-api-keys': {
          console.log('🔄 Executing reset-api-keys tool...');
          const result = await resetAPIKeysTool();
          const summary = formatAPIKeyResult(result);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
              }
            ]
          };
        }

        case 'get-config-info': {
          console.log('📊 Executing get-config-info tool...');
          const result = await getConfigInfoTool();
          const summary = formatAPIKeyResult(result);
          
          return {
            content: [
              {
                type: 'text',
                text: summary
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
      console.error(`L Tool execution failed for ${name}:`, error.message);
      
      // Handle validation errors
      if (error.name === 'ZodError') {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid parameters for ${name}: ${error.message}`
        );
      }
      
      // Handle hardware wallet errors
      if (error.constructor.name === 'HardwareWalletError') {
        throw new McpError(
          ErrorCode.InternalError,
          `Hardware wallet error: ${error.message}`
        );
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${error.message}`
      );
    }
  });

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = await listResources();
    return { resources };
  });

  // Read resource content
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    try {
      const content = await readResource(uri);
      
      return {
        contents: [
          {
            uri,
            mimeType: uri.includes('/contracts/source/') ? 'text/x-solidity' :
                     uri.includes('/docs/') ? 'text/markdown' : 'application/json',
            text: content
          }
        ]
      };
    } catch (error: any) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read resource ${uri}: ${error.message}`
      );
    }
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(): Promise<void> {
  console.error('📝 DEBUG: Creating server...');
  const server = await createServer();
  console.error('📝 DEBUG: Server created, creating transport...');
  const transport = new StdioServerTransport();
  console.error('📝 DEBUG: Transport created, connecting...');
  await server.connect(transport);
  console.error('=� DAO Deployer MCP Server started successfully');
}

/**
 * Stop the MCP server gracefully
 */
export async function stopServer(server: Server): Promise<void> {
  try {
    await server.close();
    console.error('=� DAO Deployer MCP Server stopped');
  } catch (error) {
    console.error('L Error stopping server:', error);
    throw error;
  }
}