// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {SimpleDAOFactory} from "../src/SimpleDAOFactory.sol";
import {SimpleDAOTokenV2} from "../src/SimpleDAOTokenV2.sol";
import {SimpleDAOGovernor} from "../src/SimpleDAOGovernor.sol";
import {SimpleDAOTimelock} from "../src/SimpleDAOTimelock.sol";

contract FactorySecurityTest is Test {
    SimpleDAOFactory public factory;
    
    address public owner;
    address public attacker = address(0x2);
    address public user = address(0x3);
    
    SimpleDAOFactory.DAOConfig public validConfig;
    SimpleDAOFactory.DAOConfig public attackConfig;
    
    function setUp() public {
        owner = address(this);
        factory = new SimpleDAOFactory();
        
        validConfig = SimpleDAOFactory.DAOConfig({
            tokenName: "Valid DAO Token",
            tokenSymbol: "VDT",
            initialSupply: 1000000e18,
            votingDelay: 1 days,
            votingPeriod: 1 weeks,
            proposalThreshold: 1000e18,
            quorumPercentage: 4,
            timelockDelay: 2 days
        });
        
        attackConfig = validConfig; // Start with valid config for attacks
    }
    
    function testFactoryOwnershipSetCorrectly() public view {
        assertEq(factory.owner(), owner);
    }
    
    function testAttackerCannotControlFactory() public {
        // Attacker tries to become factory owner
        vm.prank(attacker);
        vm.expectRevert();
        factory.transferOwnership(attacker);
        
        // Factory owner remains unchanged
        assertEq(factory.owner(), owner);
    }
    
    function testDeploymentCounterAccuracy() public {
        assertEq(factory.getDAOCount(), 0);
        
        // Deploy first DAO
        vm.prank(user);
        factory.deployDAO(validConfig, user);
        
        assertEq(factory.getDAOCount(), 1);
        assertEq(factory.getDAOsByDeployerCount(user), 1);
        assertEq(factory.getDAOsByDeployerCount(attacker), 0);
        
        // Deploy second DAO from different user
        vm.prank(attacker);
        factory.deployDAO(validConfig, attacker);
        
        assertEq(factory.getDAOCount(), 2);
        assertEq(factory.getDAOsByDeployerCount(user), 1);
        assertEq(factory.getDAOsByDeployerCount(attacker), 1);
        
        // Deploy third DAO from same user
        vm.prank(user);
        factory.deployDAO(validConfig, user);
        
        assertEq(factory.getDAOCount(), 3);
        assertEq(factory.getDAOsByDeployerCount(user), 2);
        assertEq(factory.getDAOsByDeployerCount(attacker), 1);
    }
    
    function testInputValidation() public {
        // Test empty token name
        attackConfig.tokenName = "";
        vm.prank(attacker);
        vm.expectRevert("Token name cannot be empty");
        factory.deployDAO(attackConfig, attacker);
        
        // Test empty token symbol
        attackConfig = validConfig;
        attackConfig.tokenSymbol = "";
        vm.prank(attacker);
        vm.expectRevert("Token symbol cannot be empty");
        factory.deployDAO(attackConfig, attacker);
        
        // Test zero initial supply
        attackConfig = validConfig;
        attackConfig.initialSupply = 0;
        vm.prank(attacker);
        vm.expectRevert("Initial supply must be greater than 0");
        factory.deployDAO(attackConfig, attacker);
        
        // Test zero voting delay
        attackConfig = validConfig;
        attackConfig.votingDelay = 0;
        vm.prank(attacker);
        vm.expectRevert("Voting delay must be greater than 0");
        factory.deployDAO(attackConfig, attacker);
        
        // Test zero voting period
        attackConfig = validConfig;
        attackConfig.votingPeriod = 0;
        vm.prank(attacker);
        vm.expectRevert("Voting period must be greater than 0");
        factory.deployDAO(attackConfig, attacker);
        
        // Test invalid quorum percentage (0)
        attackConfig = validConfig;
        attackConfig.quorumPercentage = 0;
        vm.prank(attacker);
        vm.expectRevert("Invalid quorum percentage");
        factory.deployDAO(attackConfig, attacker);
        
        // Test invalid quorum percentage (>100)
        attackConfig = validConfig;
        attackConfig.quorumPercentage = 101;
        vm.prank(attacker);
        vm.expectRevert("Invalid quorum percentage");
        factory.deployDAO(attackConfig, attacker);
        
        // Test zero recipient address
        vm.prank(attacker);
        vm.expectRevert("Recipient cannot be zero address");
        factory.deployDAO(validConfig, address(0));
    }
    
    function testExtremeParameterValues() public {
        // Test with very large supply (near uint256 max)
        attackConfig = validConfig;
        attackConfig.initialSupply = type(uint256).max / 1e18; // Divide by 1e18 to avoid overflow in token decimals
        
        vm.prank(attacker);
        (address token,,) = factory.deployDAO(attackConfig, attacker);
        
        SimpleDAOTokenV2 tokenContract = SimpleDAOTokenV2(token);
        assertEq(tokenContract.totalSupply(), attackConfig.initialSupply);
        
        // Test with very long timelock delay
        attackConfig = validConfig;
        attackConfig.timelockDelay = 365 days; // 1 year
        
        vm.prank(attacker);
        (,, address timelock) = factory.deployDAO(attackConfig, attacker);
        
        SimpleDAOTimelock timelockContract = SimpleDAOTimelock(payable(timelock));
        assertEq(timelockContract.getMinDelay(), 365 days);
        
        // Test with very short delays (but > 0)
        attackConfig = validConfig;
        attackConfig.votingDelay = 1;
        attackConfig.votingPeriod = 1;
        attackConfig.timelockDelay = 1;
        
        vm.prank(attacker);
        (address token3, address governor3, address timelock3) = factory.deployDAO(attackConfig, attacker);
        
        SimpleDAOGovernor governorContract = SimpleDAOGovernor(payable(governor3));
        SimpleDAOTimelock timelockContract3 = SimpleDAOTimelock(payable(timelock3));
        
        assertEq(governorContract.votingDelay(), 1);
        assertEq(governorContract.votingPeriod(), 1);
        assertEq(timelockContract3.getMinDelay(), 1);
    }
    
    function testGasUsageAndDOSResistance() public {
        // Test that deployment doesn't consume excessive gas
        uint256 gasBefore = gasleft();
        
        vm.prank(user);
        factory.deployDAO(validConfig, user);
        
        uint256 gasUsed = gasBefore - gasleft();
        
        // Should use reasonable amount of gas (less than 10M)
        assertTrue(gasUsed < 10_000_000, "Deployment uses too much gas");
        
        // Test multiple deployments don't cause issues
        for (uint i = 0; i < 10; i++) {
            vm.prank(address(uint160(i + 100))); // Different deployer each time
            factory.deployDAO(validConfig, address(uint160(i + 100)));
        }
        
        assertEq(factory.getDAOCount(), 11); // 1 from earlier + 10 from loop
    }
    
    function testFactoryCannotInteractWithDAOsAfterDeployment() public {
        // Deploy a DAO
        vm.prank(user);
        (address token, address governor, address timelock) = factory.deployDAO(validConfig, user);
        
        SimpleDAOTokenV2 tokenContract = SimpleDAOTokenV2(token);
        SimpleDAOGovernor governorContract = SimpleDAOGovernor(payable(governor));
        SimpleDAOTimelock timelockContract = SimpleDAOTimelock(payable(timelock));
        
        // Factory should not be able to mint tokens (timelock is owner)
        // Verify that timelock is the owner, not factory
        assertEq(tokenContract.owner(), timelock);
        
        // Create a malicious contract that tries to call token functions as factory
        MaliciousFactory maliciousFactory = new MaliciousFactory(address(tokenContract));
        
        vm.expectRevert();
        maliciousFactory.attemptMint(attacker, 1000000e18);
        
        // Factory should not have any special roles in timelock
        bytes32 adminRole = timelockContract.DEFAULT_ADMIN_ROLE();
        bytes32 proposerRole = timelockContract.PROPOSER_ROLE();
        bytes32 executorRole = timelockContract.EXECUTOR_ROLE();
        
        assertFalse(timelockContract.hasRole(adminRole, address(factory)));
        assertFalse(timelockContract.hasRole(proposerRole, address(factory)));
        
        // Factory should have executor role like everyone else (address(0) has it)
        // But this doesn't give it special powers since it still needs proposals to be queued
    }
    
    function testDAOIndependence() public {
        // Deploy two DAOs
        vm.prank(user);
        (address token1, address governor1, address timelock1) = factory.deployDAO(validConfig, user);
        
        SimpleDAOFactory.DAOConfig memory config2 = validConfig;
        config2.tokenName = "Second DAO Token";
        config2.tokenSymbol = "SDT";
        
        vm.prank(attacker);
        (address token2, address governor2, address timelock2) = factory.deployDAO(config2, attacker);
        
        // Contracts should be different
        assertTrue(token1 != token2);
        assertTrue(governor1 != governor2);
        assertTrue(timelock1 != timelock2);
        
        // Each DAO should be independent
        SimpleDAOTokenV2 token1Contract = SimpleDAOTokenV2(token1);
        SimpleDAOTokenV2 token2Contract = SimpleDAOTokenV2(token2);
        
        // Token 1 timelock should not control token 2
        assertEq(token1Contract.owner(), timelock1);
        assertEq(token2Contract.owner(), timelock2);
        
        // Different initial recipients
        assertEq(token1Contract.balanceOf(user), validConfig.initialSupply);
        assertEq(token2Contract.balanceOf(attacker), validConfig.initialSupply);
        assertEq(token1Contract.balanceOf(attacker), 0);
        assertEq(token2Contract.balanceOf(user), 0);
    }
    
    function testReentrancyProtection() public {
        // Deploy a malicious recipient that tries to reenter during token minting
        MaliciousRecipient maliciousRecipient = new MaliciousRecipient();
        maliciousRecipient.setFactory(address(factory));
        maliciousRecipient.setConfig(validConfig);
        
        // This should still work despite the malicious recipient
        // because the token minting happens in the constructor, not a callback
        vm.prank(user);
        factory.deployDAO(validConfig, address(maliciousRecipient));
        
        // The malicious recipient should have received tokens normally
        SimpleDAOFactory.DeployedDAO[] memory userDAOs = factory.getDAOsByDeployer(user);
        SimpleDAOTokenV2 deployedToken = SimpleDAOTokenV2(userDAOs[0].token);
        assertEq(deployedToken.balanceOf(address(maliciousRecipient)), validConfig.initialSupply);
    }
    
    function testArrayStorageIntegrity() public {
        // Test that DAO arrays maintain integrity under various conditions
        
        // Deploy DAOs from multiple users
        for (uint i = 0; i < 5; i++) {
            address deployer = address(uint160(i + 100));
            vm.prank(deployer);
            factory.deployDAO(validConfig, deployer);
        }
        
        // Check all arrays
        SimpleDAOFactory.DeployedDAO[] memory allDAOs = factory.getAllDAOs();
        assertEq(allDAOs.length, 5);
        
        // Each DAO should have correct deployer
        for (uint i = 0; i < 5; i++) {
            assertEq(allDAOs[i].deployer, address(uint160(i + 100)));
            assertEq(allDAOs[i].name, validConfig.tokenName);
            assertTrue(allDAOs[i].timestamp > 0);
            assertTrue(allDAOs[i].token != address(0));
            assertTrue(allDAOs[i].governor != address(0));
            assertTrue(allDAOs[i].timelock != address(0));
        }
        
        // Individual deployer arrays should be correct
        for (uint i = 0; i < 5; i++) {
            address deployer = address(uint160(i + 100));
            SimpleDAOFactory.DeployedDAO[] memory deployerDAOs = factory.getDAOsByDeployer(deployer);
            assertEq(deployerDAOs.length, 1);
            assertEq(deployerDAOs[0].deployer, deployer);
        }
    }
}

// Helper contracts for testing
contract MaliciousFactory {
    SimpleDAOTokenV2 public token;
    
    constructor(address _token) {
        token = SimpleDAOTokenV2(_token);
    }
    
    function attemptMint(address to, uint256 amount) external {
        token.mint(to, amount);
    }
}

contract MaliciousRecipient {
    SimpleDAOFactory public factory;
    SimpleDAOFactory.DAOConfig public config;
    uint256 public reentrancyCount;
    
    function setFactory(address _factory) external {
        factory = SimpleDAOFactory(_factory);
    }
    
    function setConfig(SimpleDAOFactory.DAOConfig memory _config) external {
        config = _config;
    }
    
    // This won't be called because ERC20 minting doesn't have callbacks
    // But included for completeness in testing reentrancy scenarios
    receive() external payable {
        if (reentrancyCount < 3 && address(factory) != address(0)) {
            reentrancyCount++;
            try factory.deployDAO(config, address(this)) {
                // This should fail or not be reached
            } catch {
                // Expected to fail
            }
        }
    }
}