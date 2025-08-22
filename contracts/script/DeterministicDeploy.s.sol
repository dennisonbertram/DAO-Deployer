// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {console} from "forge-std/console.sol";

import {SimpleDAOFactoryV2} from "../src/SimpleDAOFactoryV2.sol";
import {SimpleDAOTokenUpgradeable} from "../src/SimpleDAOTokenUpgradeable.sol";
import {SimpleDAOGovernorUpgradeable} from "../src/SimpleDAOGovernorUpgradeable.sol";
import {SimpleDAOTimelockUpgradeable} from "../src/SimpleDAOTimelockUpgradeable.sol";

/**
 * @title DeterministicDeploy
 * @dev Deterministic deployment script for DAO Factory system
 * 
 * Uses CREATE2 for deterministic addresses across all networks.
 * All contracts will have the same address regardless of network.
 */
contract DeterministicDeploy is Script {
    
    // Deterministic salt for CREATE2 deployments
    // Change this to get different addresses
    bytes32 public constant DEPLOYMENT_SALT = keccak256("TallyDAOFactoryV2.1.0");
    
    // Deployment configuration
    struct DeploymentAddresses {
        address tokenImplementation;
        address governorImplementation;
        address timelockImplementation;
        address factory;
    }
    
    /**
     * @dev Main deployment function
     */
    function run() external {
        // Get deployer from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("=== Deterministic DAO Factory Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Salt:", vm.toString(DEPLOYMENT_SALT));
        console.log("Network Chain ID:", block.chainid);
        
        // Predict addresses before deployment
        DeploymentAddresses memory predicted = predictAddresses(deployer);
        _logPredictedAddresses(predicted);
        
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
        
        // Verify addresses match predictions
        _verifyDeployment(predicted, deployed);
        
        console.log("=== Deployment Complete ===");
        _logFinalAddresses(deployed);
    }
    
    /**
     * @dev Predict all deployment addresses using CREATE2
     */
    function predictAddresses(address deployer) public view returns (DeploymentAddresses memory) {
        return DeploymentAddresses({
            tokenImplementation: Create2.computeAddress(
                DEPLOYMENT_SALT,
                keccak256(type(SimpleDAOTokenUpgradeable).creationCode),
                deployer
            ),
            governorImplementation: Create2.computeAddress(
                DEPLOYMENT_SALT,
                keccak256(type(SimpleDAOGovernorUpgradeable).creationCode),
                deployer
            ),
            timelockImplementation: Create2.computeAddress(
                DEPLOYMENT_SALT,
                keccak256(type(SimpleDAOTimelockUpgradeable).creationCode),
                deployer
            ),
            factory: Create2.computeAddress(
                DEPLOYMENT_SALT,
                keccak256(abi.encodePacked(
                    type(SimpleDAOFactoryV2).creationCode,
                    abi.encode(
                        Create2.computeAddress(
                            DEPLOYMENT_SALT,
                            keccak256(type(SimpleDAOTokenUpgradeable).creationCode),
                            deployer
                        ),
                        Create2.computeAddress(
                            DEPLOYMENT_SALT,
                            keccak256(type(SimpleDAOGovernorUpgradeable).creationCode),
                            deployer
                        ),
                        Create2.computeAddress(
                            DEPLOYMENT_SALT,
                            keccak256(type(SimpleDAOTimelockUpgradeable).creationCode),
                            deployer
                        )
                    )
                )),
                deployer
            )
        });
    }
    
    /**
     * @dev Deploy implementation contracts using CREATE2
     */
    function _deployImplementations() internal returns (DeploymentAddresses memory) {
        console.log("\n--- Deploying Implementation Contracts ---");
        
        // Deploy token implementation
        address tokenImpl = Create2.deploy(
            0,
            DEPLOYMENT_SALT,
            type(SimpleDAOTokenUpgradeable).creationCode
        );
        console.log("Token Implementation:", tokenImpl);
        
        // Deploy governor implementation
        address governorImpl = Create2.deploy(
            0,
            DEPLOYMENT_SALT,
            type(SimpleDAOGovernorUpgradeable).creationCode
        );
        console.log("Governor Implementation:", governorImpl);
        
        // Deploy timelock implementation
        address timelockImpl = Create2.deploy(
            0,
            DEPLOYMENT_SALT,
            type(SimpleDAOTimelockUpgradeable).creationCode
        );
        console.log("Timelock Implementation:", timelockImpl);
        
        return DeploymentAddresses({
            tokenImplementation: tokenImpl,
            governorImplementation: governorImpl,
            timelockImplementation: timelockImpl,
            factory: address(0) // Will be set later
        });
    }
    
    /**
     * @dev Deploy factory using CREATE2
     */
    function _deployFactory(
        address tokenImpl,
        address governorImpl,
        address timelockImpl
    ) internal returns (address) {
        console.log("\n--- Deploying Factory ---");
        
        bytes memory factoryCreationCode = abi.encodePacked(
            type(SimpleDAOFactoryV2).creationCode,
            abi.encode(tokenImpl, governorImpl, timelockImpl)
        );
        
        address factory = Create2.deploy(0, DEPLOYMENT_SALT, factoryCreationCode);
        console.log("Factory:", factory);
        
        return factory;
    }
    
    /**
     * @dev Verify deployment addresses match predictions
     */
    function _verifyDeployment(
        DeploymentAddresses memory predicted,
        DeploymentAddresses memory deployed
    ) internal pure {
        require(
            predicted.tokenImplementation == deployed.tokenImplementation,
            "Token implementation address mismatch"
        );
        require(
            predicted.governorImplementation == deployed.governorImplementation,
            "Governor implementation address mismatch"
        );
        require(
            predicted.timelockImplementation == deployed.timelockImplementation,
            "Timelock implementation address mismatch"
        );
        require(
            predicted.factory == deployed.factory,
            "Factory address mismatch"
        );
    }
    
    /**
     * @dev Log predicted addresses
     */
    function _logPredictedAddresses(DeploymentAddresses memory addresses) internal pure {
        console.log("\n--- Predicted Addresses ---");
        console.log("Token Implementation:", addresses.tokenImplementation);
        console.log("Governor Implementation:", addresses.governorImplementation);
        console.log("Timelock Implementation:", addresses.timelockImplementation);
        console.log("Factory:", addresses.factory);
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
        console.log("\nSave these addresses for frontend integration!");
    }
}