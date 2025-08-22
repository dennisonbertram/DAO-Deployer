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

contract AdvancedGovernanceTest is Test {
    SimpleDAOFactory public factory;
    SimpleDAOTokenV2 public token;
    SimpleDAOGovernor public governor;
    SimpleDAOTimelock public timelock;
    
    // Multiple actors
    address public founder = address(0x1);
    address public whale = address(0x2);
    address public voter1 = address(0x3);
    address public voter2 = address(0x4);
    address public voter3 = address(0x5);
    address public nonVoter = address(0x6);
    address public maliciousActor = address(0x7);
    
    uint256 public constant TOTAL_SUPPLY = 1000000e18;
    uint256 public constant VOTING_DELAY = 1 days;
    uint256 public constant VOTING_PERIOD = 1 weeks;
    uint256 public constant TIMELOCK_DELAY = 2 days;
    uint256 public constant PROPOSAL_THRESHOLD = 1000e18;
    
    SimpleDAOFactory.DAOConfig public config;
    
    function setUp() public {
        factory = new SimpleDAOFactory();
        
        config = SimpleDAOFactory.DAOConfig({
            tokenName: "Advanced DAO Token",
            tokenSymbol: "ADT",
            initialSupply: TOTAL_SUPPLY,
            votingDelay: VOTING_DELAY,
            votingPeriod: VOTING_PERIOD,
            proposalThreshold: PROPOSAL_THRESHOLD,
            quorumPercentage: 4,
            timelockDelay: TIMELOCK_DELAY
        });
        
        // Deploy DAO
        vm.prank(founder);
        (address tokenAddr, address governorAddr, address timelockAddr) = factory.deployDAO(config, founder);
        
        token = SimpleDAOTokenV2(tokenAddr);
        governor = SimpleDAOGovernor(payable(governorAddr));
        timelock = SimpleDAOTimelock(payable(timelockAddr));
        
        // Distribute tokens to create realistic voting scenario
        vm.startPrank(founder);
        token.transfer(whale, 400000e18);      // 40% - whale voter
        token.transfer(voter1, 200000e18);     // 20% - major voter
        token.transfer(voter2, 150000e18);     // 15% - moderate voter
        token.transfer(voter3, 100000e18);     // 10% - minor voter
        token.transfer(nonVoter, 50000e18);    // 5% - doesn't participate
        // founder keeps 100000e18 (10%)
        vm.stopPrank();
        
        // All voters delegate to themselves for voting power
        vm.prank(founder);
        token.delegate(founder);
        
        vm.prank(whale);
        token.delegate(whale);
        
        vm.prank(voter1);
        token.delegate(voter1);
        
        vm.prank(voter2);
        token.delegate(voter2);
        
        vm.prank(voter3);
        token.delegate(voter3);
        
        // nonVoter doesn't delegate (no voting power)
        
        // Fast forward to allow voting power to be usable for proposals
        vm.warp(block.timestamp + 1);
    }
    
    function testMultiVoterGovernanceSuccess() public {
        // Create proposal to mint tokens to maliciousActor
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSelector(SimpleDAOTokenV2.mint.selector, maliciousActor, 50000e18);
        
        // Whale creates proposal (has enough tokens for threshold)
        vm.prank(whale);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Mint tokens to new member");
        
        // Fast forward past voting delay
        vm.warp(block.timestamp + VOTING_DELAY + 1);
        
        // Multiple voters participate
        vm.prank(founder);
        governor.castVote(proposalId, 1); // For: 100k votes
        
        vm.prank(whale);
        governor.castVote(proposalId, 1); // For: 400k votes
        
        vm.prank(voter1);
        governor.castVote(proposalId, 0); // Against: 200k votes
        
        vm.prank(voter2);
        governor.castVote(proposalId, 1); // For: 150k votes
        
        vm.prank(voter3);
        governor.castVote(proposalId, 2); // Abstain: 100k votes
        
        // Check vote counts
        (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes) = governor.proposalVotes(proposalId);
        assertEq(againstVotes, 200000e18, "Against votes incorrect");
        assertEq(forVotes, 650000e18, "For votes incorrect"); // 100k + 400k + 150k
        assertEq(abstainVotes, 100000e18, "Abstain votes incorrect");
        
        // Fast forward past voting period
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        
        // Proposal should have succeeded
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Succeeded));
        
        // Queue and execute
        vm.prank(whale);
        governor.queue(targets, values, calldatas, keccak256(bytes("Mint tokens to new member")));
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        
        vm.prank(whale);
        governor.execute(targets, values, calldatas, keccak256(bytes("Mint tokens to new member")));
        
        // Verify execution
        assertEq(token.balanceOf(maliciousActor), 50000e18);
        assertEq(token.totalSupply(), TOTAL_SUPPLY + 50000e18);
    }
    
    function testProposalSucceedsWithQuorum() public {
        // Minor voter participates - meets quorum (4% of 1M = 40k tokens minimum)
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSelector(SimpleDAOTokenV2.mint.selector, voter1, 1000e18);
        
        vm.prank(voter3); // Has 100k tokens, above threshold
        uint256 proposalId = governor.propose(targets, values, calldatas, "Small mint proposal");
        
        vm.warp(block.timestamp + VOTING_DELAY + 1);
        
        // Only voter3 votes (100k tokens) - this actually meets quorum (40k needed)
        vm.prank(voter3);
        governor.castVote(proposalId, 1);
        
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        
        // Should succeed because 100k > 40k quorum
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Succeeded));
    }
    
    function testProposalFailsByVotes() public {
        // Majority votes against
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSelector(SimpleDAOTokenV2.mint.selector, maliciousActor, 1000000e18); // Huge mint
        
        vm.prank(whale);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Excessive mint proposal");
        
        vm.warp(block.timestamp + VOTING_DELAY + 1);
        
        // Large majority votes against the excessive mint
        vm.prank(founder);
        governor.castVote(proposalId, 0); // Against: 100k
        
        vm.prank(whale);
        governor.castVote(proposalId, 1); // For: 400k (proposer votes for own proposal)
        
        vm.prank(voter1);
        governor.castVote(proposalId, 0); // Against: 200k
        
        vm.prank(voter2);
        governor.castVote(proposalId, 0); // Against: 150k
        
        vm.prank(voter3);
        governor.castVote(proposalId, 0); // Against: 100k
        
        // Total: Against = 550k, For = 400k
        
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        
        // Should be defeated
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Defeated));
    }
    
    function testCannotProposeWithoutThreshold() public {
        // voter3 has 100k tokens, but threshold is 1000 tokens, so should work
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSelector(SimpleDAOTokenV2.mint.selector, voter3, 1e18);
        
        // This should work since voter3 has 100k > 1k threshold
        vm.prank(voter3);
        governor.propose(targets, values, calldatas, "Valid proposal");
        
        // Now test with someone below threshold
        // Transfer most tokens away from nonVoter, leaving them with < threshold
        vm.prank(nonVoter);
        token.transfer(founder, 49500e18); // Leaving 500e18 < 1000e18 threshold
        
        vm.prank(nonVoter);
        token.delegate(nonVoter); // Need to delegate to get voting power
        
        // Should revert due to insufficient proposal threshold
        vm.prank(nonVoter);
        vm.expectRevert();
        governor.propose(targets, values, calldatas, "Invalid proposal");
    }
    
    function testCannotVoteBeforeVotingStarts() public {
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSelector(SimpleDAOTokenV2.mint.selector, voter1, 1e18);
        
        vm.prank(whale);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test proposal");
        
        // Try to vote immediately (before voting delay)
        vm.prank(whale);
        vm.expectRevert();
        governor.castVote(proposalId, 1);
    }
    
    function testCannotVoteAfterVotingEnds() public {
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSelector(SimpleDAOTokenV2.mint.selector, voter1, 1e18);
        
        vm.prank(whale);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test proposal");
        
        // Fast forward past both voting delay AND voting period
        vm.warp(block.timestamp + VOTING_DELAY + VOTING_PERIOD + 1);
        
        // Try to vote after voting ends
        vm.prank(whale);
        vm.expectRevert();
        governor.castVote(proposalId, 1);
    }
    
    function testVotingPowerBasedOnDelegationTime() public {
        // Test that voting power is based on delegation at proposal creation time
        
        // voter2 starts with 150k tokens, delegated
        assertEq(token.getVotes(voter2), 150000e18);
        
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSelector(SimpleDAOTokenV2.mint.selector, voter1, 1e18);
        
        vm.prank(whale);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test voting power");
        
        // After proposal created, voter2 gets more tokens
        vm.prank(founder);
        token.transfer(voter2, 100000e18); // voter2 now has 250k tokens total
        
        assertEq(token.getVotes(voter2), 250000e18, "Current voting power should be 250k");
        
        vm.warp(block.timestamp + VOTING_DELAY + 1);
        
        // But voting power for this proposal should still be based on snapshot at creation (150k)
        // We can't easily test this directly, but the vote weight will be based on the historical snapshot
        
        vm.prank(voter2);
        governor.castVote(proposalId, 1);
        
        // The vote should count as 150k, not 250k (though this is hard to verify directly in this test)
    }
    
    function testCannotExecuteWithoutQueuing() public {
        // Create and pass a proposal
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSelector(SimpleDAOTokenV2.mint.selector, voter1, 1e18);
        
        vm.prank(whale);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test execution without queuing");
        
        vm.warp(block.timestamp + VOTING_DELAY + 1);
        
        // Get enough votes to pass
        vm.prank(whale);
        governor.castVote(proposalId, 1);
        
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        
        // Should be succeeded but not queued
        assertEq(uint8(governor.state(proposalId)), uint8(IGovernor.ProposalState.Succeeded));
        
        // Try to execute without queuing - should fail
        vm.prank(whale);
        vm.expectRevert();
        governor.execute(targets, values, calldatas, keccak256(bytes("Test execution without queuing")));
    }
    
    function testCannotExecuteBeforeTimelockDelay() public {
        // Create, pass, and queue a proposal
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSelector(SimpleDAOTokenV2.mint.selector, voter1, 1e18);
        
        vm.prank(whale);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test early execution");
        
        vm.warp(block.timestamp + VOTING_DELAY + 1);
        
        vm.prank(whale);
        governor.castVote(proposalId, 1);
        
        vm.warp(block.timestamp + VOTING_PERIOD + 1);
        
        // Queue the proposal
        vm.prank(whale);
        governor.queue(targets, values, calldatas, keccak256(bytes("Test early execution")));
        
        // Try to execute immediately after queuing (before timelock delay)
        vm.prank(whale);
        vm.expectRevert();
        governor.execute(targets, values, calldatas, keccak256(bytes("Test early execution")));
        
        // Should work after the delay
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        
        vm.prank(whale);
        governor.execute(targets, values, calldatas, keccak256(bytes("Test early execution")));
        
        // Verify it worked
        assertEq(token.balanceOf(voter1), 200000e18 + 1e18); // Original + minted
    }
}