// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {TimelockControllerUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";

import {SimpleDAOFactoryV2} from "../src/SimpleDAOFactoryV2.sol";
import {SimpleDAOTokenUpgradeable} from "../src/SimpleDAOTokenUpgradeable.sol";
import {SimpleDAOGovernorUpgradeable} from "../src/SimpleDAOGovernorUpgradeable.sol";
import {SimpleDAOTimelockUpgradeable} from "../src/SimpleDAOTimelockUpgradeable.sol";

contract ProxyDeploymentTest is Test {
    SimpleDAOFactoryV2 public factory;
    
    // Implementation contracts
    SimpleDAOTokenUpgradeable public tokenImpl;
    SimpleDAOGovernorUpgradeable public governorImpl;
    SimpleDAOTimelockUpgradeable public timelockImpl;
    
    address public deployer = address(0x1);
    address public user = address(0x2);
    address public factoryOwner = address(0x3);
    
    SimpleDAOFactoryV2.DAOConfig public defaultConfig;
    
    function setUp() public {
        vm.startPrank(factoryOwner);
        
        // Deploy implementation contracts
        tokenImpl = new SimpleDAOTokenUpgradeable();
        governorImpl = new SimpleDAOGovernorUpgradeable();
        timelockImpl = new SimpleDAOTimelockUpgradeable();
        
        // Deploy factory with implementations
        factory = new SimpleDAOFactoryV2(
            address(tokenImpl),
            address(governorImpl),
            address(timelockImpl)
        );
        
        vm.stopPrank();
        
        // Set up default configuration
        defaultConfig = SimpleDAOFactoryV2.DAOConfig({
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
    
    function testProxyDeploymentBasics() public {
        // Deploy DAO through factory
        vm.prank(deployer);
        (address token, address governor, address timelock) = factory.deployDAO(defaultConfig, deployer);
        
        // Verify all contracts were deployed and are non-zero
        assertTrue(token != address(0), "Token proxy not deployed");
        assertTrue(governor != address(0), "Governor proxy not deployed");
        assertTrue(timelock != address(0), "Timelock proxy not deployed");
        
        // Verify they are different addresses
        assertTrue(token != governor, "Token and governor should be different");
        assertTrue(token != timelock, "Token and timelock should be different");
        assertTrue(governor != timelock, "Governor and timelock should be different");
    }
    
    function testTokenProxyFunctionality() public {
        vm.prank(deployer);
        (address token, , address timelock) = factory.deployDAO(defaultConfig, deployer);
        
        SimpleDAOTokenUpgradeable tokenContract = SimpleDAOTokenUpgradeable(token);
        
        // Verify token was initialized correctly
        assertEq(tokenContract.name(), "Test DAO Token");
        assertEq(tokenContract.symbol(), "TDT");
        assertEq(tokenContract.totalSupply(), 1000000e18);
        assertEq(tokenContract.balanceOf(deployer), 1000000e18);
        
        // Verify ownership was transferred to timelock
        assertEq(tokenContract.owner(), timelock);
        
        // Verify voting functionality works
        assertEq(tokenContract.getVotes(deployer), 0); // No delegation yet
        
        vm.prank(deployer);
        tokenContract.delegate(deployer);
        
        assertEq(tokenContract.getVotes(deployer), 1000000e18);
    }
    
    function testGovernorProxyFunctionality() public {
        vm.prank(deployer);
        (address token, address governor, ) = factory.deployDAO(defaultConfig, deployer);
        
        SimpleDAOGovernorUpgradeable governorContract = SimpleDAOGovernorUpgradeable(payable(governor));
        
        // Verify governor was initialized correctly
        assertEq(governorContract.name(), "Test DAO Token Governor");
        assertEq(address(governorContract.token()), token);
        assertEq(governorContract.votingDelay(), 1 days);
        assertEq(governorContract.votingPeriod(), 1 weeks);
        assertEq(governorContract.proposalThreshold(), 1000e18);
        assertEq(governorContract.quorumNumerator(), 4);
    }
    
    function testTimelockProxyFunctionality() public {
        vm.prank(deployer);
        (, address governor, address timelock) = factory.deployDAO(defaultConfig, deployer);
        
        SimpleDAOTimelockUpgradeable timelockContract = SimpleDAOTimelockUpgradeable(payable(timelock));
        
        // Verify timelock was initialized correctly
        assertEq(timelockContract.getMinDelay(), 2 days);
        
        // Verify role setup is correct
        bytes32 proposerRole = timelockContract.PROPOSER_ROLE();
        bytes32 executorRole = timelockContract.EXECUTOR_ROLE();
        bytes32 adminRole = timelockContract.DEFAULT_ADMIN_ROLE();
        
        // Governor should have proposer role
        assertTrue(timelockContract.hasRole(proposerRole, governor));
        
        // Everyone should have executor role (address(0))
        assertTrue(timelockContract.hasRole(executorRole, address(0)));
        
        // Timelock should be admin of itself (self-governing)
        assertTrue(timelockContract.hasRole(adminRole, timelock));
        
        // Factory should NOT have admin role anymore
        assertFalse(timelockContract.hasRole(adminRole, address(factory)));
    }
    
    function testInitializerProtection() public {
        vm.prank(deployer);
        (address token, address governor, address timelock) = factory.deployDAO(defaultConfig, deployer);
        
        // Try to initialize token again - should fail
        vm.expectRevert();
        SimpleDAOTokenUpgradeable(token).initialize(
            "Malicious Token",
            "MAL",
            1000e18,
            address(0x999),
            address(0x999),
            address(0x999)
        );
        
        // Try to initialize governor again - should fail  
        vm.expectRevert();
        SimpleDAOGovernorUpgradeable(payable(governor)).initialize(
            "Malicious Governor",
            IVotes(token),
            TimelockControllerUpgradeable(payable(timelock)),
            1 hours,
            1 days,
            0,
            50,
            address(0x999)
        );
        
        // Try to initialize timelock again - should fail
        address[] memory proposers = new address[](1);
        address[] memory executors = new address[](1);
        proposers[0] = address(0x999);
        executors[0] = address(0x999);
        
        vm.expectRevert();
        SimpleDAOTimelockUpgradeable(payable(timelock)).initialize(
            1 hours,
            proposers,
            executors,
            address(0x999)
        );
    }
    
    function testUUPSProxyPattern() public {
        vm.prank(deployer);
        (address token, address governor, address timelock) = factory.deployDAO(defaultConfig, deployer);
        
        // Verify all contracts are UUPS proxies pointing to correct implementations
        assertEq(factory.getTokenImplementation(), address(tokenImpl));
        assertEq(factory.getGovernorImplementation(), address(governorImpl));
        assertEq(factory.getTimelockImplementation(), address(timelockImpl));
        
        // Verify upgrade authorities are correctly set to timelock
        SimpleDAOTokenUpgradeable tokenContract = SimpleDAOTokenUpgradeable(token);
        SimpleDAOGovernorUpgradeable governorContract = SimpleDAOGovernorUpgradeable(payable(governor));
        
        assertEq(tokenContract.upgradeAuthority(), timelock);
        assertEq(governorContract.upgradeAuthority(), timelock);
    }
    
    function testTimelockUUPSProxy() public {
        vm.prank(deployer);
        (, , address timelock) = factory.deployDAO(defaultConfig, deployer);
        
        // Verify timelock implementation matches what factory was initialized with
        assertEq(factory.getTimelockImplementation(), address(timelockImpl));
        
        // The timelock should be a UUPS proxy pointing to the implementation
        // We can verify this by checking if the proxy works and has upgrade functionality
        SimpleDAOTimelockUpgradeable timelockContract = SimpleDAOTimelockUpgradeable(payable(timelock));
        
        // Should be able to call getVersion() function from implementation
        assertEq(timelockContract.getVersion(), "1.0.0");
    }
    
    function testFactoryTracking() public {
        // Deploy first DAO
        vm.prank(deployer);
        factory.deployDAO(defaultConfig, deployer);
        
        assertEq(factory.getDAOCount(), 1);
        assertEq(factory.daosByDeployerCount(deployer), 1);
        
        // Deploy second DAO from different user
        vm.prank(user);
        factory.deployDAO(defaultConfig, user);
        
        assertEq(factory.getDAOCount(), 2);
        assertEq(factory.daosByDeployerCount(deployer), 1);
        assertEq(factory.daosByDeployerCount(user), 1);
        
        // Verify DAO arrays
        SimpleDAOFactoryV2.DeployedDAO[] memory allDAOs = factory.getAllDAOs();
        assertEq(allDAOs.length, 2);
        
        SimpleDAOFactoryV2.DeployedDAO[] memory deployerDAOs = factory.getDAOsByDeployer(deployer);
        assertEq(deployerDAOs.length, 1);
        assertEq(deployerDAOs[0].name, "Test DAO Token");
        assertEq(deployerDAOs[0].deployer, deployer);
    }
    
    function testInputValidation() public {
        SimpleDAOFactoryV2.DAOConfig memory invalidConfig;
        
        // Test empty token name
        invalidConfig = defaultConfig;
        invalidConfig.tokenName = "";
        
        vm.prank(deployer);
        vm.expectRevert("Token name cannot be empty");
        factory.deployDAO(invalidConfig, deployer);
        
        // Test empty token symbol
        invalidConfig = defaultConfig;
        invalidConfig.tokenSymbol = "";
        
        vm.prank(deployer);
        vm.expectRevert("Token symbol cannot be empty");
        factory.deployDAO(invalidConfig, deployer);
        
        // Test zero initial supply
        invalidConfig = defaultConfig;
        invalidConfig.initialSupply = 0;
        
        vm.prank(deployer);
        vm.expectRevert("Initial supply must be greater than 0");
        factory.deployDAO(invalidConfig, deployer);
        
        // Test invalid quorum percentage
        invalidConfig = defaultConfig;
        invalidConfig.quorumPercentage = 101;
        
        vm.prank(deployer);
        vm.expectRevert("Invalid quorum percentage");
        factory.deployDAO(invalidConfig, deployer);
        
        // Test zero recipient address
        vm.prank(deployer);
        vm.expectRevert("Recipient cannot be zero address");
        factory.deployDAO(defaultConfig, address(0));
    }
    
    function testEventEmission() public {
        // Expect DAODeployed event
        vm.expectEmit(true, false, false, false);
        emit SimpleDAOFactoryV2.DAODeployed(
            deployer,
            address(0), // We don't know the exact addresses
            address(0),
            address(0),
            "Test DAO Token"
        );
        
        vm.prank(deployer);
        factory.deployDAO(defaultConfig, deployer);
    }
    
    function testMultipleDeploymentsDontInterfere() public {
        // Deploy first DAO
        vm.prank(deployer);
        (address token1, address governor1, address timelock1) = factory.deployDAO(defaultConfig, deployer);
        
        // Deploy second DAO with different config
        SimpleDAOFactoryV2.DAOConfig memory config2 = defaultConfig;
        config2.tokenName = "Second DAO";
        config2.tokenSymbol = "SD";
        
        vm.prank(user);
        (address token2, address governor2, address timelock2) = factory.deployDAO(config2, user);
        
        // Verify contracts are independent
        assertTrue(token1 != token2);
        assertTrue(governor1 != governor2);
        assertTrue(timelock1 != timelock2);
        
        // Verify configurations are correct for each
        SimpleDAOTokenUpgradeable token1Contract = SimpleDAOTokenUpgradeable(token1);
        SimpleDAOTokenUpgradeable token2Contract = SimpleDAOTokenUpgradeable(token2);
        
        assertEq(token1Contract.name(), "Test DAO Token");
        assertEq(token2Contract.name(), "Second DAO");
        
        assertEq(token1Contract.balanceOf(deployer), 1000000e18);
        assertEq(token2Contract.balanceOf(user), 1000000e18);
        
        // Verify ownership is independent
        assertEq(token1Contract.owner(), timelock1);
        assertEq(token2Contract.owner(), timelock2);
    }
}