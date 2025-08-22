// Contract ABIs for DAO Deployer
// Using const assertions for VIEM type inference

export const FACTORY_ABI = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "allDAOs",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "governor",
        type: "address",
        internalType: "address"
      },
      {
        name: "timelock",
        type: "address",
        internalType: "address"
      },
      {
        name: "deployer",
        type: "address",
        internalType: "address"
      },
      {
        name: "name",
        type: "string",
        internalType: "string"
      },
      {
        name: "timestamp",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "deployDAO",
    inputs: [
      {
        name: "config",
        type: "tuple",
        internalType: "struct SimpleDAOFactory.DAOConfig",
        components: [
          {
            name: "tokenName",
            type: "string",
            internalType: "string"
          },
          {
            name: "tokenSymbol",
            type: "string",
            internalType: "string"
          },
          {
            name: "initialSupply",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "votingDelay",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "votingPeriod",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "proposalThreshold",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "quorumPercentage",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "timelockDelay",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      },
      {
        name: "recipient",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "governor",
        type: "address",
        internalType: "address"
      },
      {
        name: "timelock",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getAllDAOs",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct SimpleDAOFactory.DeployedDAO[]",
        components: [
          {
            name: "token",
            type: "address",
            internalType: "address"
          },
          {
            name: "governor",
            type: "address",
            internalType: "address"
          },
          {
            name: "timelock",
            type: "address",
            internalType: "address"
          },
          {
            name: "deployer",
            type: "address",
            internalType: "address"
          },
          {
            name: "name",
            type: "string",
            internalType: "string"
          },
          {
            name: "timestamp",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getDAOCount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getDAOsByDeployer",
    inputs: [
      {
        name: "deployer",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct SimpleDAOFactory.DeployedDAO[]",
        components: [
          {
            name: "token",
            type: "address",
            internalType: "address"
          },
          {
            name: "governor",
            type: "address",
            internalType: "address"
          },
          {
            name: "timelock",
            type: "address",
            internalType: "address"
          },
          {
            name: "deployer",
            type: "address",
            internalType: "address"
          },
          {
            name: "name",
            type: "string",
            internalType: "string"
          },
          {
            name: "timestamp",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getDAOsByDeployerCount",
    inputs: [
      {
        name: "deployer",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "DAODeployed",
    inputs: [
      {
        name: "deployer",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "governor",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "timelock",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "name",
        type: "string",
        indexed: false,
        internalType: "string"
      }
    ],
    anonymous: false
  }
] as const;

// Governor ABI (essential functions for governance)
export const GOVERNOR_ABI = [
  {
    type: "function",
    name: "propose",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" }
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "castVote",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" }
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "state",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "proposalVotes",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "againstVotes", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" }
    ],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "ProposalCreated",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "proposer", type: "address", indexed: true },
      { name: "targets", type: "address[]", indexed: false },
      { name: "values", type: "uint256[]", indexed: false },
      { name: "signatures", type: "string[]", indexed: false },
      { name: "calldatas", type: "bytes[]", indexed: false },
      { name: "startBlock", type: "uint256", indexed: false },
      { name: "endBlock", type: "uint256", indexed: false },
      { name: "description", type: "string", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "VoteCast",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "support", type: "uint8", indexed: false },
      { name: "weight", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false }
    ],
    anonymous: false
  }
] as const;

// Token ABI (ERC20Votes functions)
export const TOKEN_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getVotes",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "delegate",
    inputs: [{ name: "delegatee", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "delegates",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "DelegateChanged",
    inputs: [
      { name: "delegator", type: "address", indexed: true },
      { name: "fromDelegate", type: "address", indexed: true },
      { name: "toDelegate", type: "address", indexed: true }
    ],
    anonymous: false
  }
] as const;

// Timelock ABI (essential functions)
export const TIMELOCK_ABI = [
  {
    type: "function",
    name: "execute",
    inputs: [
      { name: "target", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "predecessor", type: "bytes32" },
      { name: "salt", type: "bytes32" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "executeBatch",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "datas", type: "bytes[]" },
      { name: "predecessor", type: "bytes32" },
      { name: "salt", type: "bytes32" }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "isOperation",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [{ name: "pending", type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "isOperationPending",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [{ name: "pending", type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "isOperationReady",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [{ name: "ready", type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getMinDelay",
    inputs: [],
    outputs: [{ name: "duration", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "CallExecuted",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "index", type: "uint256", indexed: true },
      { name: "target", type: "address", indexed: false },
      { name: "value", type: "uint256", indexed: false },
      { name: "data", type: "bytes", indexed: false }
    ],
    anonymous: false
  }
] as const;