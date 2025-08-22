// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {SimpleDAOFactoryV2} from "../src/SimpleDAOFactoryV2.sol";
import {SimpleDAOTokenUpgradeable} from "../src/SimpleDAOTokenUpgradeable.sol";
import {SimpleDAOGovernorUpgradeable} from "../src/SimpleDAOGovernorUpgradeable.sol";
import {SimpleDAOTimelockUpgradeable} from "../src/SimpleDAOTimelockUpgradeable.sol";

/**
 * @title LocalDeploy
 * @dev Local development deployment script for DAO Factory system
 * 
 * Simplified deployment for Anvil local chain development.
 * Optimized for fast iteration and frontend integration.
 */
contract LocalDeploy is Script {
    
    struct DeploymentAddresses {
        address tokenImplementation;
        address governorImplementation;
        address timelockImplementation;
        address factory;
    }
    
    /**
     * @dev Main deployment function for local development
     */
    function run() external {
        // Use the first account from Anvil's default accounts
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== Local DAO Factory Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Network Chain ID:", block.chainid);
        console.log("Block Number:", block.number);
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy implementation contracts
        DeploymentAddresses memory deployed = _deployImplementations();
        
        // Deploy factory
        deployed.factory = _deployFactory(
            deployed.tokenImplementation,
            deployed.governorImplementation,
            deployed.timelockImplementation
        );
        
        vm.stopBroadcast();
        
        console.log("=== Deployment Complete ===");
        _logFinalAddresses(deployed);
        // _saveAddressesToFile(deployed); // Disabled due to Foundry file permissions
        _printJSONForExtraction(deployed);
    }
    
    /**
     * @dev Deploy implementation contracts
     */
    function _deployImplementations() internal returns (DeploymentAddresses memory) {
        console.log("\n--- Deploying Implementation Contracts ---");
        
        // Deploy token implementation
        SimpleDAOTokenUpgradeable tokenImpl = new SimpleDAOTokenUpgradeable();
        console.log("Token Implementation:", address(tokenImpl));
        
        // Deploy governor implementation
        SimpleDAOGovernorUpgradeable governorImpl = new SimpleDAOGovernorUpgradeable();
        console.log("Governor Implementation:", address(governorImpl));
        
        // Deploy timelock implementation
        SimpleDAOTimelockUpgradeable timelockImpl = new SimpleDAOTimelockUpgradeable();
        console.log("Timelock Implementation:", address(timelockImpl));
        
        return DeploymentAddresses({
            tokenImplementation: address(tokenImpl),
            governorImplementation: address(governorImpl),
            timelockImplementation: address(timelockImpl),
            factory: address(0) // Will be set later
        });
    }
    
    /**
     * @dev Deploy factory
     */
    function _deployFactory(
        address tokenImpl,
        address governorImpl,
        address timelockImpl
    ) internal returns (address) {
        console.log("\n--- Deploying Factory ---");
        
        SimpleDAOFactoryV2 factory = new SimpleDAOFactoryV2(
            tokenImpl,
            governorImpl,
            timelockImpl
        );
        
        console.log("Factory:", address(factory));
        return address(factory);
    }
    
    /**
     * @dev Log final deployed addresses
     */
    function _logFinalAddresses(DeploymentAddresses memory addresses) internal pure {
        console.log("\n--- Final Deployed Addresses ---");
        console.log("Token Implementation:", addresses.tokenImplementation);
        console.log("Governor Implementation:", addresses.governorImplementation);
        console.log("Timelock Implementation:", addresses.timelockImplementation);
        console.log("Factory:", addresses.factory);
    }
    
    /**
     * @dev Save addresses to a JSON file for frontend consumption
     */
    function _saveAddressesToFile(DeploymentAddresses memory addresses) internal {
        string memory json = string.concat(
            "{\n",
            '  "chainId": ', vm.toString(block.chainid), ",\n",
            '  "factory": "', vm.toString(addresses.factory), '",\n',
            '  "tokenImplementation": "', vm.toString(addresses.tokenImplementation), '",\n',
            '  "governorImplementation": "', vm.toString(addresses.governorImplementation), '",\n',
            '  "timelockImplementation": "', vm.toString(addresses.timelockImplementation), '",\n',
            '  "deployedAt": ', vm.toString(block.timestamp), ",\n",
            '  "blockNumber": ', vm.toString(block.number), "\n",
            "}"
        );
        
        vm.writeFile("./local-contracts.json", json);
        console.log("\nContract addresses saved to ./local-contracts.json");
    }
    
    /**
     * @dev Print JSON for external extraction (due to file permission issues)
     */
    function _printJSONForExtraction(DeploymentAddresses memory addresses) internal view {
        console.log("\n=== JSON_START ===");
        console.log("{");
        console.log('  "chainId": %s,', vm.toString(block.chainid));
        console.log('  "factory": "%s",', vm.toString(addresses.factory));
        console.log('  "tokenImplementation": "%s",', vm.toString(addresses.tokenImplementation));
        console.log('  "governorImplementation": "%s",', vm.toString(addresses.governorImplementation));
        console.log('  "timelockImplementation": "%s",', vm.toString(addresses.timelockImplementation));
        console.log('  "deployedAt": %s,', vm.toString(block.timestamp));
        console.log('  "blockNumber": %s', vm.toString(block.number));
        console.log("}");
        console.log("=== JSON_END ===");
    }
}