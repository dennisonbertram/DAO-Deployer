// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {SimpleDAOFactory} from "../src/SimpleDAOFactory.sol";
import {SimpleDAOTokenV2} from "../src/SimpleDAOTokenV2.sol";
import {SimpleDAOGovernor} from "../src/SimpleDAOGovernor.sol";
import {SimpleDAOTimelock} from "../src/SimpleDAOTimelock.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

contract SimpleDAOFactoryTest is Test {
    SimpleDAOFactory public factory;
    
    address public deployer = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    
    SimpleDAOFactory.DAOConfig public defaultConfig;
    
    function setUp() public {
        // Deploy factory
        factory = new SimpleDAOFactory();
        
        // Set up default configuration
        defaultConfig = SimpleDAOFactory.DAOConfig({
            tokenName: "Test DAO Token",
            tokenSymbol: "TDT",
            initialSupply: 1000000e18,
            votingDelay: 1 days,
            votingPeriod: 1 weeks,
            proposalThreshold: 1000e18,
            quorumPercentage: 4,
            timelockDelay: 2 days
        });
    }
    
    function testDeployDAO() public {
        vm.prank(deployer);
        (address token, address governor, address timelock) = factory.deployDAO(defaultConfig, deployer);
        
        // Verify all contracts were deployed
        assertTrue(token != address(0), "Token not deployed");
        assertTrue(governor != address(0), "Governor not deployed");
        assertTrue(timelock != address(0), "Timelock not deployed");
        
        // Verify token setup
        SimpleDAOTokenV2 tokenContract = SimpleDAOTokenV2(token);
        assertEq(tokenContract.name(), "Test DAO Token");
        assertEq(tokenContract.symbol(), "TDT");
        assertEq(tokenContract.totalSupply(), 1000000e18);
        assertEq(tokenContract.balanceOf(deployer), 1000000e18);
        assertEq(tokenContract.owner(), timelock);
        
        // Verify governor setup
        SimpleDAOGovernor governorContract = SimpleDAOGovernor(payable(governor));
        assertEq(governorContract.name(), "Test DAO Token Governor");
        assertEq(address(governorContract.token()), token);
        assertEq(governorContract.votingDelay(), 1 days);
        assertEq(governorContract.votingPeriod(), 1 weeks);
        assertEq(governorContract.proposalThreshold(), 1000e18);
        assertEq(governorContract.quorumNumerator(), 4);
        
        // Verify timelock setup
        TimelockController timelockContract = TimelockController(payable(timelock));
        assertEq(timelockContract.getMinDelay(), 2 days);
        
        // Verify timelock roles
        bytes32 proposerRole = timelockContract.PROPOSER_ROLE();
        bytes32 executorRole = timelockContract.EXECUTOR_ROLE();
        bytes32 adminRole = timelockContract.DEFAULT_ADMIN_ROLE();
        
        assertTrue(timelockContract.hasRole(proposerRole, governor));
        assertTrue(timelockContract.hasRole(executorRole, governor));
        assertTrue(timelockContract.hasRole(executorRole, address(0))); // Open execution
        assertFalse(timelockContract.hasRole(adminRole, address(factory))); // Factory should not be admin
        assertTrue(timelockContract.hasRole(adminRole, timelock)); // Timelock should be self-admin
    }
    
    function testMultipleDAODeployments() public {
        // Deploy first DAO
        vm.prank(deployer);
        factory.deployDAO(defaultConfig, deployer);
        
        // Deploy second DAO with different config
        SimpleDAOFactory.DAOConfig memory config2 = defaultConfig;
        config2.tokenName = "Second DAO";
        config2.tokenSymbol = "SD";
        
        vm.prank(user1);
        factory.deployDAO(config2, user1);
        
        // Verify counts
        assertEq(factory.getDAOCount(), 2);
        assertEq(factory.getDAOsByDeployerCount(deployer), 1);
        assertEq(factory.getDAOsByDeployerCount(user1), 1);
        
        // Verify DAO arrays
        SimpleDAOFactory.DeployedDAO[] memory allDAOs = factory.getAllDAOs();
        assertEq(allDAOs.length, 2);
        assertEq(allDAOs[0].name, "Test DAO Token");
        assertEq(allDAOs[1].name, "Second DAO");
        
        SimpleDAOFactory.DeployedDAO[] memory deployerDAOs = factory.getDAOsByDeployer(deployer);
        assertEq(deployerDAOs.length, 1);
        assertEq(deployerDAOs[0].name, "Test DAO Token");
    }
    
    function testGovernanceWorkflow() public {
        vm.prank(deployer);
        (address token, address governor, address timelock) = factory.deployDAO(defaultConfig, deployer);
        
        SimpleDAOTokenV2 tokenContract = SimpleDAOTokenV2(token);
        SimpleDAOGovernor governorContract = SimpleDAOGovernor(payable(governor));
        
        // Delegate voting power to self
        vm.prank(deployer);
        tokenContract.delegate(deployer);
        
        // Fast forward to allow voting
        vm.warp(block.timestamp + 1);
        
        // Create a proposal to mint tokens (ownership should already be transferred to timelock)
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = token;
        values[0] = 0;
        calldatas[0] = abi.encodeWithSelector(SimpleDAOTokenV2.mint.selector, user1, 1000e18);
        
        vm.prank(deployer);
        uint256 proposalId = governorContract.propose(targets, values, calldatas, "Mint tokens to user1");
        
        // Fast forward past voting delay
        vm.warp(block.timestamp + 1 days + 1);
        
        // Vote on proposal
        vm.prank(deployer);
        governorContract.castVote(proposalId, 1); // Vote for
        
        // Fast forward past voting period
        vm.warp(block.timestamp + 1 weeks + 1);
        
        // Queue the proposal
        vm.prank(deployer);
        governorContract.queue(targets, values, calldatas, keccak256(bytes("Mint tokens to user1")));
        
        // Fast forward past timelock delay
        vm.warp(block.timestamp + 2 days + 1);
        
        // Execute the proposal
        vm.prank(deployer);
        governorContract.execute(targets, values, calldatas, keccak256(bytes("Mint tokens to user1")));
        
        // Verify the proposal was executed
        assertEq(tokenContract.balanceOf(user1), 1000e18);
    }
    
    function testRevertWhenDeployWithEmptyTokenName() public {
        SimpleDAOFactory.DAOConfig memory config = defaultConfig;
        config.tokenName = "";
        
        vm.prank(deployer);
        vm.expectRevert("Token name cannot be empty");
        factory.deployDAO(config, deployer);
    }
    
    function testRevertWhenDeployWithEmptyTokenSymbol() public {
        SimpleDAOFactory.DAOConfig memory config = defaultConfig;
        config.tokenSymbol = "";
        
        vm.prank(deployer);
        vm.expectRevert("Token symbol cannot be empty");
        factory.deployDAO(config, deployer);
    }
    
    function testRevertWhenDeployWithZeroSupply() public {
        SimpleDAOFactory.DAOConfig memory config = defaultConfig;
        config.initialSupply = 0;
        
        vm.prank(deployer);
        vm.expectRevert("Initial supply must be greater than 0");
        factory.deployDAO(config, deployer);
    }
    
    function testRevertWhenDeployWithInvalidQuorum() public {
        SimpleDAOFactory.DAOConfig memory config = defaultConfig;
        config.quorumPercentage = 101;
        
        vm.prank(deployer);
        vm.expectRevert("Invalid quorum percentage");
        factory.deployDAO(config, deployer);
    }
    
    function testRevertWhenDeployWithZeroAddress() public {
        vm.prank(deployer);
        vm.expectRevert("Recipient cannot be zero address");
        factory.deployDAO(defaultConfig, address(0));
    }
    
    function testEventEmission() public {
        // Only check the indexed parameters (deployer and name), not the specific addresses
        vm.expectEmit(true, false, false, false);
        emit SimpleDAOFactory.DAODeployed(deployer, address(0), address(0), address(0), "Test DAO Token");
        
        vm.prank(deployer);
        (address token, address governor, address timelock) = factory.deployDAO(defaultConfig, deployer);
        
        // Verify addresses are non-zero
        assertTrue(token != address(0));
        assertTrue(governor != address(0));
        assertTrue(timelock != address(0));
    }
}