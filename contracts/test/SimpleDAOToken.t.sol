// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {SimpleDAOTokenV2} from "../src/SimpleDAOTokenV2.sol";

contract SimpleDAOTokenTest is Test {
    SimpleDAOTokenV2 public token;
    
    address public owner = address(0x1);
    address public recipient = address(0x2);
    address public user = address(0x3);
    
    function setUp() public {
        token = new SimpleDAOTokenV2(
            "Test Token",
            "TEST", 
            recipient,
            1000000e18,
            owner
        );
    }
    
    function testInitialization() public view {
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TEST");
        assertEq(token.totalSupply(), 1000000e18);
        assertEq(token.balanceOf(recipient), 1000000e18);
        assertEq(token.owner(), owner);
    }
    
    function testMinting() public {
        uint256 mintAmount = 1000e18;
        uint256 initialSupply = token.totalSupply();
        
        vm.prank(owner);
        token.mint(user, mintAmount);
        
        assertEq(token.balanceOf(user), mintAmount);
        assertEq(token.totalSupply(), initialSupply + mintAmount);
    }
    
    function testRevertWhenMintingUnauthorized() public {
        vm.prank(user);
        vm.expectRevert();
        token.mint(user, 1000e18);
    }
    
    function testVotingPower() public {
        // Transfer tokens to user
        vm.prank(recipient);
        token.transfer(user, 1000e18);
        
        // Initially no voting power
        assertEq(token.getVotes(user), 0);
        
        // Delegate to self
        vm.prank(user);
        token.delegate(user);
        
        // Now has voting power
        assertEq(token.getVotes(user), 1000e18);
    }
    
    function testDelegationAfterTransfer() public {
        uint256 transferAmount = 1000e18;
        
        // Transfer tokens to user
        vm.prank(recipient);
        token.transfer(user, transferAmount);
        
        // Delegate to self
        vm.prank(user);
        token.delegate(user);
        
        assertEq(token.getVotes(user), transferAmount);
        
        // Transfer more tokens
        vm.prank(recipient);
        token.transfer(user, transferAmount);
        
        // Votes should be updated automatically
        assertEq(token.getVotes(user), transferAmount * 2);
    }
    
    function testClockMode() public view {
        assertEq(token.CLOCK_MODE(), "mode=timestamp");
        assertEq(token.clock(), uint48(block.timestamp));
    }
    
    function testTransferWithVotes() public {
        uint256 amount = 1000e18;
        
        // Transfer tokens to user and delegate
        vm.prank(recipient);
        token.transfer(user, amount);
        
        vm.prank(user);
        token.delegate(user);
        
        assertEq(token.getVotes(user), amount);
        assertEq(token.getVotes(recipient), 0);
        
        // Delegate recipient's tokens to themselves
        vm.prank(recipient);
        token.delegate(recipient);
        
        uint256 recipientBalance = token.balanceOf(recipient);
        assertEq(token.getVotes(recipient), recipientBalance);
        
        // Transfer from user to recipient should update votes
        vm.prank(user);
        token.transfer(recipient, amount / 2);
        
        assertEq(token.getVotes(user), amount / 2);
        assertEq(token.getVotes(recipient), recipientBalance + amount / 2);
    }
}