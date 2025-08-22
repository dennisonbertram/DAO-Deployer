// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {TimelockControllerUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {SimpleDAOFactoryV2} from "../src/SimpleDAOFactoryV2.sol";
import {SimpleDAOTokenUpgradeable} from "../src/SimpleDAOTokenUpgradeable.sol";
import {SimpleDAOGovernorUpgradeable} from "../src/SimpleDAOGovernorUpgradeable.sol";
import {SimpleDAOTimelockUpgradeable} from "../src/SimpleDAOTimelockUpgradeable.sol";

contract DAOSovereigntyTest is Test {
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
            tokenName: "Sovereignty Test DAO",
            tokenSymbol: "STD",
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
    
    function testDAOCanUpgradeOwnToken() public {
        // Create a proposal to upgrade the token
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = token;
        values[0] = 0;
        calldatas[0] = abi.encodeCall(
            UUPSUpgradeable.upgradeToAndCall,
            (address(tokenImplV2), "")
        );
        
        // Submit proposal through governance
        vm.prank(daoDeployer);
        uint256 proposalId = SimpleDAOGovernorUpgradeable(payable(governor)).propose(
            targets,
            values,
            calldatas,
            "Upgrade token to V2"
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
            keccak256(bytes("Upgrade token to V2"))
        );
        
        // Fast forward past timelock delay
        vm.warp(block.timestamp + 2 days + 1);
        
        // Execute proposal
        vm.prank(daoDeployer);
        SimpleDAOGovernorUpgradeable(payable(governor)).execute(
            targets,
            values,
            calldatas,
            keccak256(bytes("Upgrade token to V2"))
        );
        
        // Verify token was upgraded
        SimpleDAOTokenV2Mock tokenV2 = SimpleDAOTokenV2Mock(token);
        assertEq(tokenV2.tokenVersion(), "2.0.0");
        
        // Verify state is preserved
        assertEq(tokenV2.totalSupply(), 1000000e18);
        assertEq(tokenV2.balanceOf(daoDeployer), 1000000e18);
        assertEq(tokenV2.name(), "Sovereignty Test DAO");
    }
    
    function testDAOCanUpgradeOwnGovernor() public {
        // Create a proposal to upgrade the governor
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = governor;
        values[0] = 0;
        calldatas[0] = abi.encodeCall(
            UUPSUpgradeable.upgradeToAndCall,
            (address(governorImplV2), "")
        );
        
        // Submit proposal through governance
        vm.prank(daoDeployer);
        uint256 proposalId = SimpleDAOGovernorUpgradeable(payable(governor)).propose(
            targets,
            values,
            calldatas,
            "Upgrade governor to V2"
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
            keccak256(bytes("Upgrade governor to V2"))
        );
        
        // Fast forward past timelock delay
        vm.warp(block.timestamp + 2 days + 1);
        
        // Execute proposal
        vm.prank(daoDeployer);
        SimpleDAOGovernorUpgradeable(payable(governor)).execute(
            targets,
            values,
            calldatas,
            keccak256(bytes("Upgrade governor to V2"))
        );
        
        // Verify governor was upgraded
        SimpleDAOGovernorV2Mock governorV2 = SimpleDAOGovernorV2Mock(payable(governor));
        assertEq(governorV2.version(), "2.0.0");
        
        // Verify governor still functions correctly
        assertEq(governorV2.name(), "Sovereignty Test DAO Governor");
        assertEq(address(governorV2.token()), token);
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
    
    function testFactoryCannotUpgradeAnything() public {
        // Factory owner tries to directly upgrade token - should fail
        vm.prank(factoryOwner);
        vm.expectRevert("Unauthorized upgrade");
        UUPSUpgradeable(token).upgradeToAndCall(
            address(tokenImplV2),
            ""
        );
        
        // Factory owner tries to directly upgrade governor - should fail
        vm.prank(factoryOwner);
        vm.expectRevert("Unauthorized upgrade");
        UUPSUpgradeable(governor).upgradeToAndCall(
            address(governorImplV2),
            ""
        );
        
        // Factory owner tries to directly upgrade timelock - should fail
        vm.prank(factoryOwner);
        vm.expectRevert("Only self can upgrade");
        UUPSUpgradeable(timelock).upgradeToAndCall(
            address(timelockImplV2),
            ""
        );
        
        // Verify factory has no upgrade functions
        // These calls should not exist - will fail at compile time if uncommented:
        // factory.upgradeAllTokens(address(tokenImplV2));
        // factory.upgradeAllGovernors(address(governorImplV2));
    }
    
    function testAttackerCannotUpgradeAnything() public {
        // Attacker tries to directly upgrade token - should fail
        vm.prank(attacker);
        vm.expectRevert("Unauthorized upgrade");
        UUPSUpgradeable(token).upgradeToAndCall(
            address(tokenImplV2),
            ""
        );
        
        // Attacker tries to directly upgrade governor - should fail
        vm.prank(attacker);
        vm.expectRevert("Unauthorized upgrade");
        UUPSUpgradeable(governor).upgradeToAndCall(
            address(governorImplV2),
            ""
        );
        
        // Attacker tries to directly upgrade timelock - should fail
        vm.prank(attacker);
        vm.expectRevert("Only self can upgrade");
        UUPSUpgradeable(timelock).upgradeToAndCall(
            address(timelockImplV2),
            ""
        );
    }
    
    function testDAOsAreCompletelyIndependent() public {
        // Deploy second DAO
        vm.prank(user);
        (address token2, address governor2, address timelock2) = factory.deployDAO(defaultConfig, user);
        
        // Set up voting power for second DAO
        vm.prank(user);
        SimpleDAOTokenUpgradeable(token2).delegate(user);
        vm.warp(block.timestamp + 1);
        
        // First DAO upgrades its token through governance (abbreviated process)
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = token;
        values[0] = 0;
        calldatas[0] = abi.encodeCall(
            UUPSUpgradeable.upgradeToAndCall,
            (address(tokenImplV2), "")
        );
        
        // Execute first DAO governance (fast-track for test)
        vm.startPrank(daoDeployer);
        uint256 proposalId = SimpleDAOGovernorUpgradeable(payable(governor)).propose(
            targets, values, calldatas, "Upgrade token to V2"
        );
        
        vm.warp(block.timestamp + 1 days + 1);
        SimpleDAOGovernorUpgradeable(payable(governor)).castVote(proposalId, 1);
        
        vm.warp(block.timestamp + 1 weeks + 1);
        SimpleDAOGovernorUpgradeable(payable(governor)).queue(
            targets, values, calldatas, keccak256(bytes("Upgrade token to V2"))
        );
        
        vm.warp(block.timestamp + 2 days + 1);
        SimpleDAOGovernorUpgradeable(payable(governor)).execute(
            targets, values, calldatas, keccak256(bytes("Upgrade token to V2"))
        );
        vm.stopPrank();
        
        // Verify first DAO token was upgraded
        SimpleDAOTokenV2Mock token1V2 = SimpleDAOTokenV2Mock(token);
        assertEq(token1V2.tokenVersion(), "2.0.0");
        
        // Verify second DAO token was NOT affected
        SimpleDAOTokenUpgradeable token2V1 = SimpleDAOTokenUpgradeable(token2);
        // V1 doesn't have tokenVersion() function, so we check it still works as V1
        assertEq(token2V1.name(), "Sovereignty Test DAO");
        assertEq(token2V1.totalSupply(), 1000000e18);
        
        // Verify first DAO cannot upgrade second DAO's contracts
        vm.prank(daoDeployer);
        vm.expectRevert("Unauthorized upgrade");
        UUPSUpgradeable(token2).upgradeToAndCall(
            address(tokenImplV2),
            ""
        );
        
        // Verify second DAO cannot upgrade first DAO's contracts
        vm.prank(user);
        vm.expectRevert("Unauthorized upgrade");
        UUPSUpgradeable(token).upgradeToAndCall(
            address(tokenImplV2),
            ""
        );
    }
    
    function testUpgradeAuthorityIsSoverign() public {
        // Verify token upgrade authority is timelock
        SimpleDAOTokenUpgradeable tokenContract = SimpleDAOTokenUpgradeable(token);
        assertEq(tokenContract.upgradeAuthority(), timelock);
        
        // Verify governor upgrade authority is timelock
        SimpleDAOGovernorUpgradeable governorContract = SimpleDAOGovernorUpgradeable(payable(governor));
        assertEq(governorContract.upgradeAuthority(), timelock);
        
        // Verify timelock can only upgrade itself (self-upgrade pattern)
        // This is tested by attempting direct upgrades which should fail for non-self callers
        vm.prank(daoDeployer);
        vm.expectRevert("Only self can upgrade");
        UUPSUpgradeable(timelock).upgradeToAndCall(
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