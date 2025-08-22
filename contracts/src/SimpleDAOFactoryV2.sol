// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {TimelockControllerUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";

import {SimpleDAOTokenUpgradeable} from "./SimpleDAOTokenUpgradeable.sol";
import {SimpleDAOGovernorUpgradeable} from "./SimpleDAOGovernorUpgradeable.sol";
import {SimpleDAOTimelockUpgradeable} from "./SimpleDAOTimelockUpgradeable.sol";

/**
 * @title SimpleDAOFactoryV2
 * @dev Factory for deploying truly sovereign DAO systems
 * 
 * Architecture:
 * - All contracts (Token, Governor, Timelock): UUPS pattern for individual DAO control
 * 
 * Security Model:
 * - Each DAO's timelock controls ALL upgrades (token, governor, timelock itself)
 * - Factory has ZERO ongoing control after deployment
 * - Complete DAO sovereignty with no centralized upgrade risks
 */
contract SimpleDAOFactoryV2 is Ownable {
    
    // Implementation contracts for UUPS deployments
    address public immutable tokenImplementation;
    address public immutable governorImplementation;
    address public immutable timelockImplementation;
    
    // DAO configuration structure
    struct DAOConfig {
        string tokenName;
        string tokenSymbol;
        uint256 initialSupply;
        uint256 votingDelay;
        uint256 votingPeriod;
        uint256 proposalThreshold;
        uint256 quorumPercentage;
        uint256 timelockDelay;
    }
    
    // Deployed DAO tracking
    struct DeployedDAO {
        address token;
        address governor;
        address timelock;
        address deployer;
        string name;
        uint256 timestamp;
    }
    
    // Storage for deployed DAOs
    DeployedDAO[] public allDAOs;
    mapping(address => DeployedDAO[]) public daosByDeployer;
    mapping(address => uint256) public daosByDeployerCount;
    
    // Events
    event DAODeployed(
        address indexed deployer,
        address indexed token,
        address indexed governor,
        address timelock,
        string name
    );
    
    /**
     * @dev Constructor - stores implementation addresses for UUPS deployments
     * @param tokenImpl Token implementation address
     * @param governorImpl Governor implementation address
     * @param timelockImpl Timelock implementation address
     */
    constructor(
        address tokenImpl,
        address governorImpl,
        address timelockImpl
    ) Ownable(msg.sender) {
        require(tokenImpl != address(0), "Invalid token implementation");
        require(governorImpl != address(0), "Invalid governor implementation");
        require(timelockImpl != address(0), "Invalid timelock implementation");
        
        tokenImplementation = tokenImpl;
        governorImplementation = governorImpl;
        timelockImplementation = timelockImpl;
    }
    
    /**
     * @dev Deploy a complete DAO system with upgradeable components
     * @param config DAO configuration parameters
     * @param recipient Address to receive initial token supply
     * @return token Address of deployed token proxy
     * @return governor Address of deployed governor proxy
     * @return timelock Address of deployed timelock proxy
     */
    function deployDAO(
        DAOConfig calldata config,
        address recipient
    ) external returns (
        address token, 
        address governor, 
        address timelock
    ) {
        // Input validation
        require(bytes(config.tokenName).length > 0, "Token name cannot be empty");
        require(bytes(config.tokenSymbol).length > 0, "Token symbol cannot be empty");
        require(config.initialSupply > 0, "Initial supply must be greater than 0");
        require(config.votingDelay > 0, "Voting delay must be greater than 0");
        require(config.votingPeriod > 0, "Voting period must be greater than 0");
        require(config.quorumPercentage > 0 && config.quorumPercentage <= 100, "Invalid quorum percentage");
        require(recipient != address(0), "Recipient cannot be zero address");
        
        // Deploy timelock first (UUPS proxy)
        timelock = _deployTimelock(config.timelockDelay);
        
        // Deploy token with beacon proxy
        token = _deployToken(config, recipient, timelock);
        
        // Deploy governor with beacon proxy
        governor = _deployGovernor(config, token, timelock);
        
        // Configure DAO relationships and permissions
        _configureDAO(token, governor, timelock);
        
        // Store DAO information
        DeployedDAO memory dao = DeployedDAO({
            token: token,
            governor: governor,
            timelock: timelock,
            deployer: msg.sender,
            name: config.tokenName,
            timestamp: block.timestamp
        });
        
        allDAOs.push(dao);
        daosByDeployer[msg.sender].push(dao);
        daosByDeployerCount[msg.sender]++;
        
        emit DAODeployed(msg.sender, token, governor, timelock, config.tokenName);
    }
    
    /**
     * @dev Deploy timelock using UUPS proxy pattern
     */
    function _deployTimelock(uint256 timelockDelay) internal returns (address) {
        address[] memory proposers = new address[](0); // Will be set later
        address[] memory executors = new address[](1);
        executors[0] = address(0); // Open execution
        
        return address(new ERC1967Proxy(
            timelockImplementation,
            abi.encodeCall(
                SimpleDAOTimelockUpgradeable.initialize,
                (
                    timelockDelay,
                    proposers,
                    executors,
                    address(this) // Temporary admin, will be transferred
                )
            )
        ));
    }
    
    /**
     * @dev Deploy token using UUPS proxy pattern with timelock authorization
     */
    function _deployToken(
        DAOConfig calldata config,
        address recipient,
        address timelock
    ) internal returns (address) {
        return address(new ERC1967Proxy(
            tokenImplementation,
            abi.encodeCall(
                SimpleDAOTokenUpgradeable.initialize,
                (
                    config.tokenName,
                    config.tokenSymbol,
                    config.initialSupply,
                    recipient,
                    timelock, // Timelock will own the token
                    timelock  // Timelock is upgrade authority
                )
            )
        ));
    }
    
    /**
     * @dev Deploy governor using UUPS proxy pattern with timelock authorization
     */
    function _deployGovernor(
        DAOConfig calldata config,
        address token,
        address timelock
    ) internal returns (address) {
        return address(new ERC1967Proxy(
            governorImplementation,
            abi.encodeCall(
                SimpleDAOGovernorUpgradeable.initialize,
                (
                    string(abi.encodePacked(config.tokenName, " Governor")),
                    IVotes(token),
                    TimelockControllerUpgradeable(payable(timelock)),
                    config.votingDelay,
                    config.votingPeriod,
                    config.proposalThreshold,
                    config.quorumPercentage,
                    timelock  // Timelock is upgrade authority
                )
            )
        ));
    }
    
    /**
     * @dev Configure DAO permissions and relationships
     * This is critical for security - sets up proper governance structure
     */
    function _configureDAO(
        address /* token */,
        address governor,
        address timelock
    ) internal {
        SimpleDAOTimelockUpgradeable timelockContract = 
            SimpleDAOTimelockUpgradeable(payable(timelock));
        
        bytes32 proposerRole = timelockContract.PROPOSER_ROLE();
        // bytes32 executorRole = timelockContract.EXECUTOR_ROLE(); // Unused for now
        bytes32 adminRole = timelockContract.DEFAULT_ADMIN_ROLE();
        
        // Grant proposer role to governor
        timelockContract.grantRole(proposerRole, governor);
        
        // Executor role is already granted to address(0) for open execution
        
        // Grant admin role to timelock itself for self-governance
        timelockContract.grantRole(adminRole, timelock);
        
        // Revoke factory's admin role - DAO is now self-governing
        timelockContract.renounceRole(adminRole, address(this));
    }
    
    // NOTE: Factory has NO upgrade functions - all upgrades controlled by individual DAOs
    
    /**
     * @dev Get total count of deployed DAOs
     */
    function getDAOCount() external view returns (uint256) {
        return allDAOs.length;
    }
    
    /**
     * @dev Get all deployed DAOs
     */
    function getAllDAOs() external view returns (DeployedDAO[] memory) {
        return allDAOs;
    }
    
    /**
     * @dev Get DAOs deployed by a specific address
     */
    function getDAOsByDeployer(address deployer) external view returns (DeployedDAO[] memory) {
        return daosByDeployer[deployer];
    }
    
    /**
     * @dev Get token implementation address used for new deployments
     */
    function getTokenImplementation() external view returns (address) {
        return tokenImplementation;
    }
    
    /**
     * @dev Get governor implementation address used for new deployments
     */
    function getGovernorImplementation() external view returns (address) {
        return governorImplementation;
    }
    
    /**
     * @dev Get timelock implementation address used for new deployments
     */
    function getTimelockImplementation() external view returns (address) {
        return timelockImplementation;
    }
}