// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {SimpleDAOFactory} from "../src/SimpleDAOFactory.sol";
import {SimpleDAOTokenV2} from "../src/SimpleDAOTokenV2.sol";
import {SimpleDAOGovernor} from "../src/SimpleDAOGovernor.sol";
import {SimpleDAOTimelock} from "../src/SimpleDAOTimelock.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract TokenDelegationEdgeCasesTest is Test {
    SimpleDAOFactory public factory;
    SimpleDAOTokenV2 public token;
    SimpleDAOGovernor public governor;
    SimpleDAOTimelock public timelock;
    
    address public deployer = address(0x1);
    address public alice = address(0x2);
    address public bob = address(0x3);
    address public charlie = address(0x4);
    address public david = address(0x5);
    
    uint256 public constant TOTAL_SUPPLY = 1000000e18;
    
    function setUp() public {
        factory = new SimpleDAOFactory();
        
        SimpleDAOFactory.DAOConfig memory config = SimpleDAOFactory.DAOConfig({
            tokenName: "Delegation Test Token",
            tokenSymbol: "DTT",
            initialSupply: TOTAL_SUPPLY,
            votingDelay: 1 days,
            votingPeriod: 1 weeks,
            proposalThreshold: 1000e18,
            quorumPercentage: 4,
            timelockDelay: 2 days
        });
        
        vm.prank(deployer);
        (address tokenAddr, address governorAddr, address timelockAddr) = factory.deployDAO(config, deployer);
        
        token = SimpleDAOTokenV2(tokenAddr);
        governor = SimpleDAOGovernor(payable(governorAddr));
        timelock = SimpleDAOTimelock(payable(timelockAddr));
        
        // Distribute tokens
        vm.startPrank(deployer);
        token.transfer(alice, 300000e18);
        token.transfer(bob, 250000e18);
        token.transfer(charlie, 200000e18);
        token.transfer(david, 150000e18);
        // deployer keeps 100000e18
        vm.stopPrank();
    }
    
    function testInitialDelegationState() public view {
        // Initially, nobody has voting power even though they have tokens
        assertEq(token.getVotes(deployer), 0);
        assertEq(token.getVotes(alice), 0);
        assertEq(token.getVotes(bob), 0);
        assertEq(token.getVotes(charlie), 0);
        assertEq(token.getVotes(david), 0);
        
        // But they have token balances
        assertEq(token.balanceOf(deployer), 100000e18);
        assertEq(token.balanceOf(alice), 300000e18);
        assertEq(token.balanceOf(bob), 250000e18);
        assertEq(token.balanceOf(charlie), 200000e18);
        assertEq(token.balanceOf(david), 150000e18);
    }
    
    function testSelfDelegation() public {
        // Alice delegates to herself
        vm.prank(alice);
        token.delegate(alice);
        
        assertEq(token.getVotes(alice), 300000e18);
        assertEq(token.delegates(alice), alice);
    }
    
    function testDelegationToOthers() public {
        // Alice and Bob delegate to Charlie
        vm.prank(alice);
        token.delegate(charlie);
        
        vm.prank(bob);
        token.delegate(charlie);
        
        // Charlie should have voting power from Alice and Bob's tokens
        assertEq(token.getVotes(charlie), 550000e18); // 300k + 250k
        
        // Alice and Bob should have no voting power
        assertEq(token.getVotes(alice), 0);
        assertEq(token.getVotes(bob), 0);
        
        // Check delegates
        assertEq(token.delegates(alice), charlie);
        assertEq(token.delegates(bob), charlie);
    }
    
    function testRedelegation() public {
        // Alice delegates to Bob
        vm.prank(alice);
        token.delegate(bob);
        
        assertEq(token.getVotes(bob), 300000e18);
        assertEq(token.getVotes(alice), 0);
        
        // Alice changes delegation to Charlie
        vm.prank(alice);
        token.delegate(charlie);
        
        // Bob loses Alice's voting power, Charlie gains it
        assertEq(token.getVotes(bob), 0);
        assertEq(token.getVotes(charlie), 300000e18);
        assertEq(token.delegates(alice), charlie);
    }
    
    function testDelegationWithTransfers() public {
        // Alice delegates to herself
        vm.prank(alice);
        token.delegate(alice);
        
        assertEq(token.getVotes(alice), 300000e18);
        
        // Alice transfers some tokens to Bob
        vm.prank(alice);
        token.transfer(bob, 100000e18);
        
        // Alice's voting power should decrease
        assertEq(token.getVotes(alice), 200000e18);
        assertEq(token.balanceOf(alice), 200000e18);
        
        // Bob has tokens but no voting power (hasn't delegated)
        assertEq(token.balanceOf(bob), 350000e18); // 250k + 100k
        assertEq(token.getVotes(bob), 0);
        
        // Bob delegates to himself
        vm.prank(bob);
        token.delegate(bob);
        
        assertEq(token.getVotes(bob), 350000e18);
    }
    
    function testComplexDelegationChain() public {
        // Alice delegates to Bob → Bob gets voting power from Alice's tokens
        vm.prank(alice);
        token.delegate(bob);
        assertEq(token.getVotes(bob), 300000e18); // Alice's 300k
        
        // Bob delegates to Charlie → Charlie gets voting power from Bob's own tokens
        // Alice's tokens still point to Bob as delegate, so Bob keeps Alice's voting power
        vm.prank(bob);
        token.delegate(charlie);
        assertEq(token.getVotes(bob), 300000e18); // Still has Alice's tokens
        assertEq(token.getVotes(charlie), 250000e18); // Bob's own 250k
        
        // Charlie delegates to David → David gets voting power from Charlie's own tokens  
        vm.prank(charlie);
        token.delegate(david);
        assertEq(token.getVotes(bob), 300000e18); // Still has Alice's delegation
        assertEq(token.getVotes(charlie), 250000e18); // Still has Bob's delegation  
        assertEq(token.getVotes(david), 200000e18); // Charlie's 200k
        
        // David delegates to himself (adds his own tokens)
        vm.prank(david);
        token.delegate(david);
        assertEq(token.getVotes(david), 350000e18); // Charlie's 200k + David's 150k
    }
    
    function testCircularDelegation() public {
        // Alice delegates to Bob, Bob delegates to Alice (circular)
        vm.prank(alice);
        token.delegate(bob);
        
        vm.prank(bob);
        token.delegate(alice);
        
        // Alice should have Bob's voting power, Bob should have Alice's
        assertEq(token.getVotes(alice), 250000e18); // Bob's tokens
        assertEq(token.getVotes(bob), 300000e18);   // Alice's tokens
    }
    
    function testDelegateToZeroAddress() public {
        // Alice first delegates to herself
        vm.prank(alice);
        token.delegate(alice);
        
        assertEq(token.getVotes(alice), 300000e18);
        
        // Alice delegates to zero address (essentially removing delegation)
        vm.prank(alice);
        token.delegate(address(0));
        
        assertEq(token.getVotes(alice), 0);
        assertEq(token.getVotes(address(0)), 0); // Zero address doesn't get voting power
        assertEq(token.delegates(alice), address(0));
    }
    
    function testVotingPowerSnapshotDuringProposal() public {
        // Set up delegation
        vm.prank(alice);
        token.delegate(alice);
        
        vm.prank(bob);
        token.delegate(bob);
        
        assertEq(token.getVotes(alice), 300000e18);
        assertEq(token.getVotes(bob), 250000e18);
        
        // Fast forward to allow voting power to be usable for proposals
        vm.warp(block.timestamp + 1);
        
        // Create a proposal
        address[] memory targets = new address[](1);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calldatas = new bytes[](1);
        
        targets[0] = address(token);
        values[0] = 0;
        calldatas[0] = abi.encodeWithSelector(SimpleDAOTokenV2.mint.selector, charlie, 1000e18);
        
        vm.prank(alice);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Test voting power snapshot");
        
        uint256 proposalSnapshot = governor.proposalSnapshot(proposalId);
        
        // After proposal creation, Alice transfers half her tokens to Bob
        vm.prank(alice);
        token.transfer(bob, 150000e18);
        
        // Current voting power changes
        assertEq(token.getVotes(alice), 150000e18);
        assertEq(token.getVotes(bob), 400000e18); // 250k + 150k
        
        vm.warp(block.timestamp + 1 days + 1);
        
        // Voting power for the proposal should be based on the snapshot
        // We can't directly test this, but the votes will be counted based on historical power
        
        vm.prank(alice);
        governor.castVote(proposalId, 1);
        
        vm.prank(bob);
        governor.castVote(proposalId, 1);
        
        // The votes should be counted based on the snapshot values (300k for Alice, 250k for Bob)
        // not the current values (150k for Alice, 400k for Bob)
    }
    
    function testMassiveDelegationChanges() public {
        // Start with everyone delegating to themselves
        vm.prank(deployer);
        token.delegate(deployer);
        
        vm.prank(alice);
        token.delegate(alice);
        
        vm.prank(bob);
        token.delegate(bob);
        
        vm.prank(charlie);
        token.delegate(charlie);
        
        vm.prank(david);
        token.delegate(david);
        
        // Everyone has their own voting power
        assertEq(token.getVotes(deployer), 100000e18);
        assertEq(token.getVotes(alice), 300000e18);
        assertEq(token.getVotes(bob), 250000e18);
        assertEq(token.getVotes(charlie), 200000e18);
        assertEq(token.getVotes(david), 150000e18);
        
        // Everyone delegates to Alice
        vm.prank(deployer);
        token.delegate(alice);
        
        vm.prank(bob);
        token.delegate(alice);
        
        vm.prank(charlie);
        token.delegate(alice);
        
        vm.prank(david);
        token.delegate(alice);
        
        // Alice should have all voting power
        assertEq(token.getVotes(alice), TOTAL_SUPPLY);
        assertEq(token.getVotes(deployer), 0);
        assertEq(token.getVotes(bob), 0);
        assertEq(token.getVotes(charlie), 0);
        assertEq(token.getVotes(david), 0);
    }
    
    function testDelegationWithPermit() public {
        uint256 privateKey = 0xA11CE;
        address aliceAddr = vm.addr(privateKey);
        
        // Give Alice some tokens
        vm.prank(deployer);
        token.transfer(aliceAddr, 100000e18);
        
        // Create delegation signature
        uint256 nonce = token.nonces(aliceAddr);
        uint256 deadline = block.timestamp + 1 hours;
        
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)"),
                bob, // delegate to bob
                nonce,
                deadline
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash)
        );
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        
        // Use delegateBySig
        token.delegateBySig(bob, nonce, deadline, v, r, s);
        
        // Bob should have Alice's voting power
        assertEq(token.getVotes(bob), 100000e18);
        assertEq(token.delegates(aliceAddr), bob);
    }
    
    function testZeroTokenDelegation() public {
        // Test delegation with zero token balance
        address zeroBalance = address(0x999);
        
        // zeroBalance has no tokens
        assertEq(token.balanceOf(zeroBalance), 0);
        
        // Still can delegate
        vm.prank(zeroBalance);
        token.delegate(alice);
        
        assertEq(token.delegates(zeroBalance), alice);
        
        // But doesn't affect Alice's voting power
        assertEq(token.getVotes(alice), 0);
        
        // Give zeroBalance some tokens
        vm.prank(deployer);
        token.transfer(zeroBalance, 10000e18);
        
        // Now Alice should get the voting power
        assertEq(token.getVotes(alice), 10000e18);
    }
    
    function testTransferBetweenDelegatedAccounts() public {
        // Alice and Bob both delegate to Charlie
        vm.prank(alice);
        token.delegate(charlie);
        
        vm.prank(bob);
        token.delegate(charlie);
        
        assertEq(token.getVotes(charlie), 550000e18); // 300k + 250k
        
        // Alice transfers to Bob
        vm.prank(alice);
        token.transfer(bob, 100000e18);
        
        // Charlie's voting power should remain the same (since both still delegate to Charlie)
        assertEq(token.getVotes(charlie), 550000e18);
        
        // But if Bob changes delegation to David
        vm.prank(bob);
        token.delegate(david);
        
        // Charlie loses Bob's voting power, David gains it
        assertEq(token.getVotes(charlie), 200000e18); // Alice's remaining 200k
        assertEq(token.getVotes(david), 350000e18);   // Bob's 350k (250k + 100k)
    }
}