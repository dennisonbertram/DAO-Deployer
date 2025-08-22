// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

import {SimpleDAOTokenV2} from "./SimpleDAOTokenV2.sol";
import {SimpleDAOGovernor} from "./SimpleDAOGovernor.sol";
import {SimpleDAOTimelock} from "./SimpleDAOTimelock.sol";

contract SimpleDAOFactory is Ownable {
    using Clones for address;

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

    struct DeployedDAO {
        address token;
        address governor;
        address timelock;
        address deployer;
        string name;
        uint256 timestamp;
    }

    mapping(address => DeployedDAO[]) public daosByDeployer;
    DeployedDAO[] public allDAOs;

    event DAODeployed(
        address indexed deployer,
        address indexed token,
        address indexed governor,
        address timelock,
        string name
    );

    constructor() Ownable(msg.sender) {}

    function deployDAO(
        DAOConfig calldata config,
        address recipient
    ) external returns (address token, address governor, address timelock) {
        require(bytes(config.tokenName).length > 0, "Token name cannot be empty");
        require(bytes(config.tokenSymbol).length > 0, "Token symbol cannot be empty");
        require(config.initialSupply > 0, "Initial supply must be greater than 0");
        require(config.votingDelay > 0, "Voting delay must be greater than 0");
        require(config.votingPeriod > 0, "Voting period must be greater than 0");
        require(config.quorumPercentage > 0 && config.quorumPercentage <= 100, "Invalid quorum percentage");
        require(recipient != address(0), "Recipient cannot be zero address");

        // Deploy Token with factory as initial owner (will be transferred later)
        token = address(new SimpleDAOTokenV2(
            config.tokenName,
            config.tokenSymbol,
            recipient,
            config.initialSupply,
            address(this)
        ));

        // Deploy Timelock with factory as admin initially
        timelock = address(new SimpleDAOTimelock(
            config.timelockDelay,
            new address[](0), // Empty proposers initially
            new address[](0), // Empty executors initially  
            address(this) // Factory is admin initially
        ));

        // Deploy Governor
        governor = address(new SimpleDAOGovernor(
            string(abi.encodePacked(config.tokenName, " Governor")),
            IVotes(token),
            TimelockController(payable(timelock)),
            config.votingDelay,
            config.votingPeriod,
            config.proposalThreshold,
            config.quorumPercentage
        ));

        // Set up roles for timelock
        _setupTimelockRoles(timelock, governor);
        
        // Transfer token ownership to timelock for governance
        SimpleDAOTokenV2(token).transferOwnership(timelock);

        // Store DAO info
        DeployedDAO memory newDAO = DeployedDAO({
            token: token,
            governor: governor,
            timelock: timelock,
            deployer: msg.sender,
            name: config.tokenName,
            timestamp: block.timestamp
        });

        daosByDeployer[msg.sender].push(newDAO);
        allDAOs.push(newDAO);

        emit DAODeployed(msg.sender, token, governor, timelock, config.tokenName);

        return (token, governor, timelock);
    }

    function _setupTimelockRoles(address _timelock, address _governor) internal {
        TimelockController timelock = TimelockController(payable(_timelock));
        
        bytes32 proposerRole = timelock.PROPOSER_ROLE();
        bytes32 executorRole = timelock.EXECUTOR_ROLE();
        bytes32 adminRole = timelock.DEFAULT_ADMIN_ROLE();

        // Grant proposer and executor roles to the governor
        timelock.grantRole(proposerRole, _governor);
        timelock.grantRole(executorRole, _governor);
        
        // Grant executor role to everyone (for open execution)
        timelock.grantRole(executorRole, address(0));

        // The factory initially has admin role, but we should transfer it to the timelock itself
        // This allows the timelock to be self-governing through proposals
        timelock.grantRole(adminRole, _timelock);
        
        // Now revoke admin role from factory so timelock governs itself
        timelock.revokeRole(adminRole, address(this));
    }

    function getDAOsByDeployer(address deployer) external view returns (DeployedDAO[] memory) {
        return daosByDeployer[deployer];
    }

    function getAllDAOs() external view returns (DeployedDAO[] memory) {
        return allDAOs;
    }

    function getDAOCount() external view returns (uint256) {
        return allDAOs.length;
    }

    function getDAOsByDeployerCount(address deployer) external view returns (uint256) {
        return daosByDeployer[deployer].length;
    }
}
