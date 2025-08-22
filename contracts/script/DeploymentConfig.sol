// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title DeploymentConfig
 * @dev Centralized configuration for deterministic deployments
 * 
 * Provides network-specific configurations and deployment parameters.
 * Ensures consistent deployment across different environments.
 */
library DeploymentConfig {
    
    // Network identifiers
    uint256 public constant ETHEREUM_MAINNET = 1;
    uint256 public constant ETHEREUM_SEPOLIA = 11155111;
    uint256 public constant POLYGON_MAINNET = 137;
    uint256 public constant POLYGON_MUMBAI = 80001;
    uint256 public constant ARBITRUM_ONE = 42161;
    uint256 public constant ARBITRUM_SEPOLIA = 421614;
    uint256 public constant OPTIMISM_MAINNET = 10;
    uint256 public constant OPTIMISM_SEPOLIA = 11155420;
    uint256 public constant BASE_MAINNET = 8453;
    uint256 public constant BASE_SEPOLIA = 84532;
    
    // Deployment salt versions for different releases
    bytes32 public constant SALT_V1_0_0 = keccak256("TallyDAOFactoryV2.1.0.0");
    bytes32 public constant SALT_V1_0_1 = keccak256("TallyDAOFactoryV2.1.0.1");
    bytes32 public constant SALT_V1_1_0 = keccak256("TallyDAOFactoryV2.1.1.0");
    
    // Current deployment salt
    bytes32 public constant CURRENT_SALT = SALT_V1_0_0;
    
    /**
     * @dev Network configuration structure
     */
    struct NetworkConfig {
        string name;
        string rpcUrl;
        address expectedDeployer;
        uint256 gasPrice;
        uint256 gasLimit;
        bool isTestnet;
    }
    
    /**
     * @dev Get network configuration by chain ID
     */
    function getNetworkConfig(uint256 chainId) internal pure returns (NetworkConfig memory) {
        if (chainId == ETHEREUM_MAINNET) {
            return NetworkConfig({
                name: "Ethereum Mainnet",
                rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/",
                expectedDeployer: address(0), // Set in environment
                gasPrice: 20 gwei,
                gasLimit: 5000000,
                isTestnet: false
            });
        } else if (chainId == ETHEREUM_SEPOLIA) {
            return NetworkConfig({
                name: "Ethereum Sepolia",
                rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/",
                expectedDeployer: address(0),
                gasPrice: 10 gwei,
                gasLimit: 5000000,
                isTestnet: true
            });
        } else if (chainId == POLYGON_MAINNET) {
            return NetworkConfig({
                name: "Polygon Mainnet",
                rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/",
                expectedDeployer: address(0),
                gasPrice: 30 gwei,
                gasLimit: 5000000,
                isTestnet: false
            });
        } else if (chainId == ARBITRUM_ONE) {
            return NetworkConfig({
                name: "Arbitrum One",
                rpcUrl: "https://arb-mainnet.g.alchemy.com/v2/",
                expectedDeployer: address(0),
                gasPrice: 0.1 gwei,
                gasLimit: 10000000,
                isTestnet: false
            });
        } else if (chainId == OPTIMISM_MAINNET) {
            return NetworkConfig({
                name: "Optimism Mainnet",
                rpcUrl: "https://opt-mainnet.g.alchemy.com/v2/",
                expectedDeployer: address(0),
                gasPrice: 0.001 gwei,
                gasLimit: 5000000,
                isTestnet: false
            });
        } else if (chainId == BASE_MAINNET) {
            return NetworkConfig({
                name: "Base Mainnet",
                rpcUrl: "https://mainnet.base.org",
                expectedDeployer: address(0),
                gasPrice: 0.001 gwei,
                gasLimit: 5000000,
                isTestnet: false
            });
        } else {
            // Default configuration for unknown networks
            return NetworkConfig({
                name: "Unknown Network",
                rpcUrl: "",
                expectedDeployer: address(0),
                gasPrice: 20 gwei,
                gasLimit: 5000000,
                isTestnet: true
            });
        }
    }
    
    /**
     * @dev Check if a network is supported for production deployment
     */
    function isProductionNetwork(uint256 chainId) internal pure returns (bool) {
        return chainId == ETHEREUM_MAINNET ||
               chainId == POLYGON_MAINNET ||
               chainId == ARBITRUM_ONE ||
               chainId == OPTIMISM_MAINNET ||
               chainId == BASE_MAINNET;
    }
    
    /**
     * @dev Check if a network is a testnet
     */
    function isTestnet(uint256 chainId) internal pure returns (bool) {
        return chainId == ETHEREUM_SEPOLIA ||
               chainId == POLYGON_MUMBAI ||
               chainId == ARBITRUM_SEPOLIA ||
               chainId == OPTIMISM_SEPOLIA ||
               chainId == BASE_SEPOLIA;
    }
    
    /**
     * @dev Get deployment salt for specific version
     */
    function getSaltForVersion(string memory version) internal pure returns (bytes32) {
        if (keccak256(bytes(version)) == keccak256("1.0.0")) {
            return SALT_V1_0_0;
        } else if (keccak256(bytes(version)) == keccak256("1.0.1")) {
            return SALT_V1_0_1;
        } else if (keccak256(bytes(version)) == keccak256("1.1.0")) {
            return SALT_V1_1_0;
        } else {
            return CURRENT_SALT;
        }
    }
}