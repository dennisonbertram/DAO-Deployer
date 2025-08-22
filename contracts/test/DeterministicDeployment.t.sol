// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";

import {DeterministicDeploy} from "../script/DeterministicDeploy.s.sol";
import {DeploymentConfig} from "../script/DeploymentConfig.sol";
import {SimpleDAOFactoryV2} from "../src/SimpleDAOFactoryV2.sol";
import {SimpleDAOTokenUpgradeable} from "../src/SimpleDAOTokenUpgradeable.sol";
import {SimpleDAOGovernorUpgradeable} from "../src/SimpleDAOGovernorUpgradeable.sol";
import {SimpleDAOTimelockUpgradeable} from "../src/SimpleDAOTimelockUpgradeable.sol";

/**
 * @title DeterministicDeploymentTest
 * @dev Tests for deterministic deployment across networks and deployers
 */
contract DeterministicDeploymentTest is Test {
    
    DeterministicDeploy deployer;
    
    // Test deployer addresses
    address deployer1 = 0x1234567890123456789012345678901234567890;
    address deployer2 = 0xABCDabcdABcDabcDaBCDAbcdABcdAbCdABcDABCd;
    address deployer3 = 0x742d35CC6634c0532925a3b8d0Ff6c3A0B6aF8c2;
    
    // Network chain IDs for testing
    uint256[] networkChainIds;
    
    function setUp() public {
        deployer = new DeterministicDeploy();
        
        // Setup network chain IDs
        networkChainIds.push(DeploymentConfig.ETHEREUM_MAINNET);
        networkChainIds.push(DeploymentConfig.POLYGON_MAINNET);
        networkChainIds.push(DeploymentConfig.ARBITRUM_ONE);
        networkChainIds.push(DeploymentConfig.OPTIMISM_MAINNET);
        networkChainIds.push(DeploymentConfig.BASE_MAINNET);
        networkChainIds.push(DeploymentConfig.ETHEREUM_SEPOLIA);
    }
    
    /**
     * @dev Test that addresses are identical across all networks for same deployer
     */
    function testIdenticalAddressesAcrossNetworks() public {
        console.log("=== Testing Identical Addresses Across Networks ===");
        
        address testDeployer = deployer1;
        DeterministicDeploy.DeploymentAddresses memory baselineAddresses = 
            deployer.predictAddresses(testDeployer);
        
        console.log("Baseline addresses for deployer:", testDeployer);
        console.log("Token Implementation:", baselineAddresses.tokenImplementation);
        console.log("Governor Implementation:", baselineAddresses.governorImplementation);
        console.log("Timelock Implementation:", baselineAddresses.timelockImplementation);
        console.log("Factory:", baselineAddresses.factory);
        
        // Test on multiple simulated networks (chain ID doesn't affect CREATE2)
        for (uint256 i = 0; i < networkChainIds.length; i++) {
            uint256 chainId = networkChainIds[i];
            DeploymentConfig.NetworkConfig memory config = DeploymentConfig.getNetworkConfig(chainId);
            
            console.log("\nTesting network:", config.name, "Chain ID:", chainId);
            
            // Simulate network by setting chain ID
            vm.chainId(chainId);
            
            // Predict addresses on this "network"
            DeterministicDeploy.DeploymentAddresses memory networkAddresses = 
                deployer.predictAddresses(testDeployer);
            
            // Verify addresses are identical
            assertEq(
                networkAddresses.tokenImplementation, 
                baselineAddresses.tokenImplementation,
                "Token implementation address differs across networks"
            );
            assertEq(
                networkAddresses.governorImplementation, 
                baselineAddresses.governorImplementation,
                "Governor implementation address differs across networks"
            );
            assertEq(
                networkAddresses.timelockImplementation, 
                baselineAddresses.timelockImplementation,
                "Timelock implementation address differs across networks"
            );
            assertEq(
                networkAddresses.factory, 
                baselineAddresses.factory,
                "Factory address differs across networks"
            );
            
            console.log("Addresses identical on", config.name);
        }
        
        console.log("All networks have identical addresses!");
    }
    
    /**
     * @dev Test that different deployers get different addresses
     */
    function testDifferentAddressesForDifferentDeployers() public {
        console.log("\n=== Testing Different Addresses for Different Deployers ===");
        
        address[] memory deployers = new address[](3);
        deployers[0] = deployer1;
        deployers[1] = deployer2;
        deployers[2] = deployer3;
        
        DeterministicDeploy.DeploymentAddresses[] memory allAddresses = 
            new DeterministicDeploy.DeploymentAddresses[](3);
        
        // Get addresses for each deployer
        for (uint256 i = 0; i < deployers.length; i++) {
            allAddresses[i] = deployer.predictAddresses(deployers[i]);
            console.log("Deployer", i + 1, ":", deployers[i]);
            console.log("  Factory:", allAddresses[i].factory);
        }
        
        // Verify all addresses are different
        for (uint256 i = 0; i < allAddresses.length; i++) {
            for (uint256 j = i + 1; j < allAddresses.length; j++) {
                assertTrue(
                    allAddresses[i].tokenImplementation != allAddresses[j].tokenImplementation,
                    "Token implementation addresses should differ between deployers"
                );
                assertTrue(
                    allAddresses[i].governorImplementation != allAddresses[j].governorImplementation,
                    "Governor implementation addresses should differ between deployers"
                );
                assertTrue(
                    allAddresses[i].timelockImplementation != allAddresses[j].timelockImplementation,
                    "Timelock implementation addresses should differ between deployers"
                );
                assertTrue(
                    allAddresses[i].factory != allAddresses[j].factory,
                    "Factory addresses should differ between deployers"
                );
            }
        }
        
        console.log("All deployers have unique addresses!");
    }
    
    /**
     * @dev Test that same deployer gets identical addresses across different salts
     */
    function testDifferentSaltsProduceDifferentAddresses() public {
        console.log("\n=== Testing Different Salts Produce Different Addresses ===");
        
        address testDeployer = deployer1;
        
        // Test with different salt versions
        bytes32[] memory salts = new bytes32[](3);
        salts[0] = DeploymentConfig.SALT_V1_0_0;
        salts[1] = DeploymentConfig.SALT_V1_0_1;
        salts[2] = DeploymentConfig.SALT_V1_1_0;
        
        string[] memory versions = new string[](3);
        versions[0] = "v1.0.0";
        versions[1] = "v1.0.1";
        versions[2] = "v1.1.0";
        
        address[] memory factoryAddresses = new address[](3);
        
        for (uint256 i = 0; i < salts.length; i++) {
            factoryAddresses[i] = _predictFactoryAddress(testDeployer, salts[i]);
            console.log("Version", versions[i], "Factory:", factoryAddresses[i]);
        }
        
        // Verify all addresses are different
        for (uint256 i = 0; i < factoryAddresses.length; i++) {
            for (uint256 j = i + 1; j < factoryAddresses.length; j++) {
                assertTrue(
                    factoryAddresses[i] != factoryAddresses[j],
                    "Factory addresses should differ between salt versions"
                );
            }
        }
        
        console.log("Different salts produce different addresses!");
    }
    
    /**
     * @dev Test actual deployment produces predicted addresses
     */
    function testActualDeploymentMatchesPrediction() public {
        console.log("\n=== Testing Actual Deployment Matches Prediction ===");
        
        address testDeployer = deployer1;
        vm.startPrank(testDeployer);
        
        // Predict addresses
        DeterministicDeploy.DeploymentAddresses memory predicted = 
            deployer.predictAddresses(testDeployer);
        
        console.log("Predicted addresses:");
        console.log("Token Implementation:", predicted.tokenImplementation);
        console.log("Governor Implementation:", predicted.governorImplementation);
        console.log("Timelock Implementation:", predicted.timelockImplementation);
        console.log("Factory:", predicted.factory);
        
        // Deploy implementations using CREATE2
        address tokenImpl = Create2.deploy(
            0,
            deployer.DEPLOYMENT_SALT(),
            type(SimpleDAOTokenUpgradeable).creationCode
        );
        
        address governorImpl = Create2.deploy(
            0,
            deployer.DEPLOYMENT_SALT(),
            type(SimpleDAOGovernorUpgradeable).creationCode
        );
        
        address timelockImpl = Create2.deploy(
            0,
            deployer.DEPLOYMENT_SALT(),
            type(SimpleDAOTimelockUpgradeable).creationCode
        );
        
        // Deploy factory
        bytes memory factoryCreationCode = abi.encodePacked(
            type(SimpleDAOFactoryV2).creationCode,
            abi.encode(tokenImpl, governorImpl, timelockImpl)
        );
        
        address factoryAddr = Create2.deploy(
            0,
            deployer.DEPLOYMENT_SALT(),
            factoryCreationCode
        );
        
        vm.stopPrank();
        
        // Verify actual matches predicted
        assertEq(tokenImpl, predicted.tokenImplementation, "Token implementation mismatch");
        assertEq(governorImpl, predicted.governorImplementation, "Governor implementation mismatch");
        assertEq(timelockImpl, predicted.timelockImplementation, "Timelock implementation mismatch");
        assertEq(factoryAddr, predicted.factory, "Factory address mismatch");
        
        console.log("Actual deployment matches prediction perfectly!");
    }
    
    /**
     * @dev Test network configuration consistency
     */
    function testNetworkConfigurationConsistency() public view {
        console.log("\n=== Testing Network Configuration Consistency ===");
        
        for (uint256 i = 0; i < networkChainIds.length; i++) {
            uint256 chainId = networkChainIds[i];
            DeploymentConfig.NetworkConfig memory config = DeploymentConfig.getNetworkConfig(chainId);
            
            // Verify configuration is valid
            assertTrue(bytes(config.name).length > 0, "Network name should not be empty");
            assertTrue(config.gasPrice > 0, "Gas price should be greater than 0");
            assertTrue(config.gasLimit > 0, "Gas limit should be greater than 0");
            
            // Verify network type classification
            if (chainId == DeploymentConfig.ETHEREUM_MAINNET ||
                chainId == DeploymentConfig.POLYGON_MAINNET ||
                chainId == DeploymentConfig.ARBITRUM_ONE ||
                chainId == DeploymentConfig.OPTIMISM_MAINNET ||
                chainId == DeploymentConfig.BASE_MAINNET) {
                assertTrue(DeploymentConfig.isProductionNetwork(chainId), "Should be production network");
                assertFalse(config.isTestnet, "Should not be testnet");
            } else {
                assertFalse(DeploymentConfig.isProductionNetwork(chainId), "Should not be production network");
                assertTrue(config.isTestnet, "Should be testnet");
            }
            
            console.log("Configuration valid for", config.name);
        }
        
        console.log("All network configurations are consistent!");
    }
    
    /**
     * @dev Helper function to predict factory address with custom salt
     */
    function _predictFactoryAddress(address deployerAddr, bytes32 salt) internal pure returns (address) {
        // Predict implementation addresses
        address tokenImpl = Create2.computeAddress(
            salt,
            keccak256(type(SimpleDAOTokenUpgradeable).creationCode),
            deployerAddr
        );
        
        address governorImpl = Create2.computeAddress(
            salt,
            keccak256(type(SimpleDAOGovernorUpgradeable).creationCode),
            deployerAddr
        );
        
        address timelockImpl = Create2.computeAddress(
            salt,
            keccak256(type(SimpleDAOTimelockUpgradeable).creationCode),
            deployerAddr
        );
        
        // Predict factory address
        bytes memory factoryCreationCode = abi.encodePacked(
            type(SimpleDAOFactoryV2).creationCode,
            abi.encode(tokenImpl, governorImpl, timelockImpl)
        );
        
        return Create2.computeAddress(
            salt,
            keccak256(factoryCreationCode),
            deployerAddr
        );
    }
    
    /**
     * @dev Test deployment salt management
     */
    function testSaltVersionManagement() public view {
        console.log("\n=== Testing Salt Version Management ===");
        
        // Test salt retrieval by version
        bytes32 salt100 = DeploymentConfig.getSaltForVersion("1.0.0");
        bytes32 salt101 = DeploymentConfig.getSaltForVersion("1.0.1");
        bytes32 salt110 = DeploymentConfig.getSaltForVersion("1.1.0");
        bytes32 saltUnknown = DeploymentConfig.getSaltForVersion("unknown");
        
        // Verify known versions return correct salts
        assertEq(salt100, DeploymentConfig.SALT_V1_0_0, "Version 1.0.0 salt mismatch");
        assertEq(salt101, DeploymentConfig.SALT_V1_0_1, "Version 1.0.1 salt mismatch");
        assertEq(salt110, DeploymentConfig.SALT_V1_1_0, "Version 1.1.0 salt mismatch");
        
        // Verify unknown version returns current salt
        assertEq(saltUnknown, DeploymentConfig.CURRENT_SALT, "Unknown version should return current salt");
        
        // Verify all salts are different
        assertTrue(salt100 != salt101, "v1.0.0 and v1.0.1 salts should differ");
        assertTrue(salt100 != salt110, "v1.0.0 and v1.1.0 salts should differ");
        assertTrue(salt101 != salt110, "v1.0.1 and v1.1.0 salts should differ");
        
        console.log("Salt version management working correctly!");
    }
}