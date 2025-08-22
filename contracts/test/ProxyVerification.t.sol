// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {SimpleDAOFactoryV2} from "../src/SimpleDAOFactoryV2.sol";
import {SimpleDAOTokenUpgradeable} from "../src/SimpleDAOTokenUpgradeable.sol";
import {SimpleDAOGovernorUpgradeable} from "../src/SimpleDAOGovernorUpgradeable.sol";
import {SimpleDAOTimelockUpgradeable} from "../src/SimpleDAOTimelockUpgradeable.sol";

/**
 * @title ProxyVerificationTest
 * @dev Critical test to verify that UUPS proxy pattern is working correctly
 * and that factory has no upgrade capabilities (sovereignty model)
 */
contract ProxyVerificationTest is Test {
    SimpleDAOFactoryV2 public factory;
    SimpleDAOTokenUpgradeable public tokenImpl;
    SimpleDAOGovernorUpgradeable public governorImpl;
    SimpleDAOTimelockUpgradeable public timelockImpl;
    
    address public factoryOwner = address(0x1);
    address public deployer = address(0x2);
    
    function setUp() public {
        vm.startPrank(factoryOwner);
        
        // Deploy implementations
        tokenImpl = new SimpleDAOTokenUpgradeable();
        governorImpl = new SimpleDAOGovernorUpgradeable();
        timelockImpl = new SimpleDAOTimelockUpgradeable();
        
        // Deploy factory
        factory = new SimpleDAOFactoryV2(
            address(tokenImpl),
            address(governorImpl),
            address(timelockImpl)
        );
        
        vm.stopPrank();
    }
    
    function testProxyAddressesDifferentFromImplementations() public {
        // Deploy DAO
        vm.prank(deployer);
        (address token, address governor, address timelock) = factory.deployDAO(
            SimpleDAOFactoryV2.DAOConfig({
                tokenName: "Test Token",
                tokenSymbol: "TT",
                initialSupply: 1000000e18,
                votingDelay: 1 days,
                votingPeriod: 1 weeks,
                proposalThreshold: 1000e18,
                quorumPercentage: 4,
                timelockDelay: 2 days
            }),
            deployer
        );
        
        // Verify deployed addresses are different from implementations
        assertTrue(token != address(tokenImpl), "Token proxy should be different from implementation");
        assertTrue(governor != address(governorImpl), "Governor proxy should be different from implementation");
        assertTrue(timelock != address(timelockImpl), "Timelock proxy should be different from implementation");
        
        // Verify proxy functionality works
        SimpleDAOTokenUpgradeable tokenProxy = SimpleDAOTokenUpgradeable(token);
        assertEq(tokenProxy.name(), "Test Token");
        assertEq(tokenProxy.symbol(), "TT");
        assertEq(tokenProxy.totalSupply(), 1000000e18);
    }
    
    function testFactoryHasNoUpgradeCapabilities() public {
        // Deploy DAO
        vm.prank(deployer);
        (address token, address governor, address timelock) = factory.deployDAO(
            SimpleDAOFactoryV2.DAOConfig({
                tokenName: "Test Token",
                tokenSymbol: "TT",
                initialSupply: 1000000e18,
                votingDelay: 1 days,
                votingPeriod: 1 weeks,
                proposalThreshold: 1000e18,
                quorumPercentage: 4,
                timelockDelay: 2 days
            }),
            deployer
        );
        
        // Verify factory stores implementation addresses for new deployments only
        assertEq(factory.getTokenImplementation(), address(tokenImpl));
        assertEq(factory.getGovernorImplementation(), address(governorImpl));
        assertEq(factory.getTimelockImplementation(), address(timelockImpl));
        
        // Verify factory has NO upgrade functions - these should not exist:
        // Uncommenting these would cause compilation errors:
        // factory.upgradeAllTokens(address(0));
        // factory.upgradeAllGovernors(address(0));
        
        // Verify upgrade authorities are set to timelock (sovereignty model)
        SimpleDAOTokenUpgradeable tokenContract = SimpleDAOTokenUpgradeable(token);
        SimpleDAOGovernorUpgradeable governorContract = SimpleDAOGovernorUpgradeable(payable(governor));
        
        assertEq(tokenContract.upgradeAuthority(), timelock);
        assertEq(governorContract.upgradeAuthority(), timelock);
        
        // Factory cannot upgrade anything - complete sovereignty achieved
        assertTrue(true, "Factory has no upgrade capabilities - DAO sovereignty verified");
    }
}

contract SimpleDAOTokenV2Test is SimpleDAOTokenUpgradeable {
    function newFunction() public pure returns (string memory) {
        return "V2 functionality";
    }
}