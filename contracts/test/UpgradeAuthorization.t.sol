// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {TimelockControllerUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {SimpleDAOFactoryV2} from "../src/SimpleDAOFactoryV2.sol";
import {SimpleDAOTokenUpgradeable} from "../src/SimpleDAOTokenUpgradeable.sol";
import {SimpleDAOGovernorUpgradeable} from "../src/SimpleDAOGovernorUpgradeable.sol";
import {SimpleDAOTimelockUpgradeable} from "../src/SimpleDAOTimelockUpgradeable.sol";

contract UpgradeAuthorizationTest is Test {
    SimpleDAOFactoryV2 public factory;
    
    // Implementation contracts (V1)
    SimpleDAOTokenUpgradeable public tokenImplV1;
    SimpleDAOGovernorUpgradeable public governorImplV1;
    SimpleDAOTimelockUpgradeable public timelockImplV1;
    
    // V2 implementations for upgrade testing
    SimpleDAOTokenV2Mock public tokenImplV2;
    SimpleDAOGovernorV2Mock public governorImplV2;
    SimpleDAOTimelockV2Mock public timelockImplV2;
    
    address public factoryOwner = address(0x1);
    address public daoDeployer = address(0x2);
    address public attacker = address(0x3);
    address public user = address(0x4);
    
    // Deployed DAO addresses
    address public token;
    address public governor;
    address public timelock;
    
    SimpleDAOFactoryV2.DAOConfig public defaultConfig;
    
    function setUp() public {
        vm.startPrank(factoryOwner);
        
        // Deploy V1 implementation contracts
        tokenImplV1 = new SimpleDAOTokenUpgradeable();
        governorImplV1 = new SimpleDAOGovernorUpgradeable();
        timelockImplV1 = new SimpleDAOTimelockUpgradeable();
        
        // Deploy V2 implementation contracts (with version changes)
        tokenImplV2 = new SimpleDAOTokenV2Mock();
        governorImplV2 = new SimpleDAOGovernorV2Mock();
        timelockImplV2 = new SimpleDAOTimelockV2Mock();
        
        // Deploy factory
        factory = new SimpleDAOFactoryV2(
            address(tokenImplV1),
            address(governorImplV1),
            address(timelockImplV1)
        );
        
        vm.stopPrank();
        
        // Set up default configuration
        defaultConfig = SimpleDAOFactoryV2.DAOConfig({
            tokenName: "Upgrade Test DAO",
            tokenSymbol: "UTD",
            initialSupply: 1000000e18,
            votingDelay: 1 days,
            votingPeriod: 1 weeks,
            proposalThreshold: 1000e18,
            quorumPercentage: 4,
            timelockDelay: 2 days
        });
        
        // Deploy a DAO for testing
        vm.prank(daoDeployer);
        (token, governor, timelock) = factory.deployDAO(defaultConfig, daoDeployer);
        
        // Set up voting power for governance
        vm.prank(daoDeployer);
        SimpleDAOTokenUpgradeable(token).delegate(daoDeployer);
        
        // Fast forward to allow voting power to be usable
        vm.warp(block.timestamp + 1);
    }
    
    function testFactoryHasNoUpgradePowers() public {
        // Verify factory has implementations for new deployments only
        assertEq(factory.getTokenImplementation(), address(tokenImplV1));
        assertEq(factory.getGovernorImplementation(), address(governorImplV1));
        assertEq(factory.getTimelockImplementation(), address(timelockImplV1));
        
        // Factory should have NO upgrade functions - these calls should fail at compile time
        // Uncommenting these would cause compilation errors:
        // factory.upgradeAllTokens(address(tokenImplV2));
        // factory.upgradeAllGovernors(address(governorImplV2));
        
        // Factory owner cannot directly upgrade any deployed contracts
        vm.prank(factoryOwner);
        vm.expectRevert("Unauthorized upgrade");
        UUPSUpgradeable(token).upgradeToAndCall(address(tokenImplV2), "");
        
        vm.prank(factoryOwner);
        vm.expectRevert("Unauthorized upgrade");
        UUPSUpgradeable(governor).upgradeToAndCall(address(governorImplV2), "");
        
        vm.prank(factoryOwner);
        vm.expectRevert("Only self can upgrade");
        UUPSUpgradeable(timelock).upgradeToAndCall(address(timelockImplV2), "");
    }
    
    function testNoOneCanBypassUpgradeAuthorization() public {
        // Attacker tries to directly upgrade token - should fail
        vm.prank(attacker);
        vm.expectRevert("Unauthorized upgrade");
        UUPSUpgradeable(token).upgradeToAndCall(address(tokenImplV2), "");
        
        // DAO deployer tries to directly upgrade token - should fail
        vm.prank(daoDeployer);
        vm.expectRevert("Unauthorized upgrade");
        UUPSUpgradeable(token).upgradeToAndCall(address(tokenImplV2), "");
        
        // Attacker tries to directly upgrade governor - should fail
        vm.prank(attacker);
        vm.expectRevert("Unauthorized upgrade");
        UUPSUpgradeable(governor).upgradeToAndCall(address(governorImplV2), "");
        
        // DAO deployer tries to directly upgrade governor - should fail
        vm.prank(daoDeployer);
        vm.expectRevert("Unauthorized upgrade");
        UUPSUpgradeable(governor).upgradeToAndCall(address(governorImplV2), "");
        
        // Only timelock (through governance) can authorize upgrades
        SimpleDAOTokenUpgradeable tokenContract = SimpleDAOTokenUpgradeable(token);
        SimpleDAOGovernorUpgradeable governorContract = SimpleDAOGovernorUpgradeable(payable(governor));
        
        assertEq(tokenContract.upgradeAuthority(), timelock);
        assertEq(governorContract.upgradeAuthority(), timelock);
    }
    
    function testDAOCanUpgradeOwnTimelock() public {
        // Create a proposal to upgrade the timelock
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = timelock;
        values[0] = 0;
        calldatas[0] = abi.encodeCall(
            UUPSUpgradeable.upgradeToAndCall,
            (address(timelockImplV2), "")
        );
        
        // Submit proposal through governance
        vm.prank(daoDeployer);
        uint256 proposalId = SimpleDAOGovernorUpgradeable(payable(governor)).propose(
            targets,
            values,
            calldatas,
            "Upgrade timelock to V2"
        );
        
        // Fast forward past voting delay
        vm.warp(block.timestamp + 1 days + 1);
        
        // Vote on proposal
        vm.prank(daoDeployer);
        SimpleDAOGovernorUpgradeable(payable(governor)).castVote(proposalId, 1);
        
        // Fast forward past voting period
        vm.warp(block.timestamp + 1 weeks + 1);
        
        // Queue proposal
        vm.prank(daoDeployer);
        SimpleDAOGovernorUpgradeable(payable(governor)).queue(
            targets,
            values,
            calldatas,
            keccak256(bytes("Upgrade timelock to V2"))
        );
        
        // Fast forward past timelock delay
        vm.warp(block.timestamp + 2 days + 1);
        
        // Execute proposal
        vm.prank(daoDeployer);
        SimpleDAOGovernorUpgradeable(payable(governor)).execute(
            targets,
            values,
            calldatas,
            keccak256(bytes("Upgrade timelock to V2"))
        );
        
        // Verify timelock was upgraded
        SimpleDAOTimelockV2Mock timelockV2 = SimpleDAOTimelockV2Mock(payable(timelock));
        assertEq(timelockV2.getVersion(), "2.0.0");
        
        // Verify timelock still functions correctly
        assertEq(timelockV2.getMinDelay(), 2 days);
        
        // Verify roles are still correct
        bytes32 adminRole = timelockV2.DEFAULT_ADMIN_ROLE();
        assertTrue(timelockV2.hasRole(adminRole, timelock));
    }
    
    function testAttackerCannotDirectlyUpgradeTimelock() public {
        // Attacker tries to directly call upgrade function - should fail
        vm.prank(attacker);
        vm.expectRevert();
        UUPSUpgradeable(timelock).upgradeToAndCall(
            address(timelockImplV2),
            ""
        );
        
        // DAO deployer tries to directly call upgrade function - should fail
        // Even though they have tokens, they don't have TIMELOCK_ADMIN_ROLE directly
        vm.prank(daoDeployer);
        vm.expectRevert();
        UUPSUpgradeable(timelock).upgradeToAndCall(
            address(timelockImplV2),
            ""
        );
        
        // Factory owner tries to directly upgrade timelock - should fail
        vm.prank(factoryOwner);
        vm.expectRevert();
        UUPSUpgradeable(timelock).upgradeToAndCall(
            address(timelockImplV2),
            ""
        );
    }
    
    // This test is moved to DAOSovereignty.t.sol as testDAOCanUpgradeOwnToken()
    // where upgrades happen through proper governance process
    
    // This test is replaced by testDAOsAreCompletelyIndependent() in DAOSovereignty.t.sol
    // where DAOs upgrade independently and cannot affect each other
    
    function testIndividualTimelockUpgradesAreIndependent() public {
        // Deploy second DAO
        vm.prank(user);
        (address token2, address governor2, address timelock2) = factory.deployDAO(defaultConfig, user);
        
        // Set up voting power for second DAO
        vm.prank(user);
        SimpleDAOTokenUpgradeable(token2).delegate(user);
        vm.warp(block.timestamp + 1);
        
        // First DAO upgrades its timelock (same process as testDAOCanUpgradeOwnTimelock)
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = timelock;
        values[0] = 0;
        calldatas[0] = abi.encodeCall(
            UUPSUpgradeable.upgradeToAndCall,
            (address(timelockImplV2), "")
        );
        
        vm.prank(daoDeployer);
        uint256 proposalId = SimpleDAOGovernorUpgradeable(payable(governor)).propose(
            targets,
            values,
            calldatas,
            "Upgrade timelock to V2"
        );
        
        vm.warp(block.timestamp + 1 days + 1);
        
        vm.prank(daoDeployer);
        SimpleDAOGovernorUpgradeable(payable(governor)).castVote(proposalId, 1);
        
        vm.warp(block.timestamp + 1 weeks + 1);
        
        vm.prank(daoDeployer);
        SimpleDAOGovernorUpgradeable(payable(governor)).queue(
            targets,
            values,
            calldatas,
            keccak256(bytes("Upgrade timelock to V2"))
        );
        
        vm.warp(block.timestamp + 2 days + 1);
        
        vm.prank(daoDeployer);
        SimpleDAOGovernorUpgradeable(payable(governor)).execute(
            targets,
            values,
            calldatas,
            keccak256(bytes("Upgrade timelock to V2"))
        );
        
        // Verify first DAO timelock was upgraded
        SimpleDAOTimelockV2Mock timelock1V2 = SimpleDAOTimelockV2Mock(payable(timelock));
        assertEq(timelock1V2.getVersion(), "2.0.0");
        
        // Verify second DAO timelock was NOT affected
        SimpleDAOTimelockUpgradeable timelock2V1 = SimpleDAOTimelockUpgradeable(payable(timelock2));
        // V1 doesn't have version() function, so we verify it still works as V1
        assertEq(timelock2V1.getMinDelay(), 2 days);
        
        // Second DAO cannot be upgraded by first DAO's governance
        vm.prank(daoDeployer);
        vm.expectRevert();
        SimpleDAOTimelockUpgradeable(payable(timelock2)).upgradeToAndCall(
            address(timelockImplV2),
            ""
        );
    }
}

// Mock V2 implementations for testing upgrades
contract SimpleDAOTokenV2Mock is SimpleDAOTokenUpgradeable {
    function tokenVersion() public pure returns (string memory) {
        return "2.0.0";
    }
}

contract SimpleDAOGovernorV2Mock is SimpleDAOGovernorUpgradeable {
    function version() public pure virtual override returns (string memory) {
        return "2.0.0";
    }
}

contract SimpleDAOTimelockV2Mock is SimpleDAOTimelockUpgradeable {
    function getVersion() public pure override returns (string memory) {
        return "2.0.0";
    }
}