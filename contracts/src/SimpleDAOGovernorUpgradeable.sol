// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {GovernorUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import {GovernorCountingSimpleUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorCountingSimpleUpgradeable.sol";
import {GovernorSettingsUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorSettingsUpgradeable.sol";
import {GovernorStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorStorageUpgradeable.sol";
import {GovernorTimelockControlUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorTimelockControlUpgradeable.sol";
import {GovernorVotesUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol";
import {GovernorVotesQuorumFractionUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesQuorumFractionUpgradeable.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {TimelockControllerUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";

/**
 * @title SimpleDAOGovernorUpgradeable
 * @dev Upgradeable Governor contract with full OpenZeppelin extensions
 * Uses UUPS pattern for individual DAO control over upgrades
 * Each DAO's timelock controls governor upgrades through governance voting
 */
contract SimpleDAOGovernorUpgradeable is 
    Initializable, 
    GovernorUpgradeable, 
    GovernorSettingsUpgradeable, 
    GovernorCountingSimpleUpgradeable, 
    GovernorStorageUpgradeable, 
    GovernorVotesUpgradeable, 
    GovernorVotesQuorumFractionUpgradeable, 
    GovernorTimelockControlUpgradeable,
    UUPSUpgradeable 
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @dev Address authorized to upgrade this contract (typically timelock)
    address public upgradeAuthority;

    /**
     * @dev Initialize the governor contract
     * @param name The name of the governor (e.g., "MyDAO Governor")
     * @param token The voting token contract
     * @param timelock The timelock controller for delayed execution
     * @param votingDelay Time delay between proposal creation and voting start
     * @param votingPeriod Duration of the voting period
     * @param proposalThreshold_ Minimum token balance required to create proposals
     * @param quorumPercentage Percentage of total supply required for quorum (as percentage)
     * @param _upgradeAuthority Address that can authorize upgrades (typically timelock)
     */
    function initialize(
        string memory name,
        IVotes token,
        TimelockControllerUpgradeable timelock,
        uint256 votingDelay,
        uint256 votingPeriod,
        uint256 proposalThreshold_,
        uint256 quorumPercentage,
        address _upgradeAuthority
    ) public initializer {
        __Governor_init(name);
        __GovernorSettings_init(uint48(votingDelay), uint32(votingPeriod), proposalThreshold_);
        __GovernorCountingSimple_init();
        __GovernorStorage_init();
        __GovernorVotes_init(token);
        __GovernorVotesQuorumFraction_init(quorumPercentage);
        __GovernorTimelockControl_init(timelock);
        // Note: UUPSUpgradeable doesn't require initialization in OZ v5
        
        upgradeAuthority = _upgradeAuthority;
    }

    /**
     * @dev Get the current version of this contract
     */
    function version() public pure virtual override returns (string memory) {
        return "1.0.0";
    }

    // The following functions are overrides required by Solidity.

    function state(uint256 proposalId)
        public
        view
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function proposalThreshold()
        public
        view
        override(GovernorUpgradeable, GovernorSettingsUpgradeable)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function _propose(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, string memory description, address proposer)
        internal
        override(GovernorUpgradeable, GovernorStorageUpgradeable)
        returns (uint256)
    {
        return super._propose(targets, values, calldatas, description, proposer);
    }

    function _queueOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (uint48)
    {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
    {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
        returns (address)
    {
        return super._executor();
    }

    /**
     * @dev Authorize upgrade - only upgrade authority (timelock) can authorize
     * This ensures all governor upgrades go through governance process
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyUpgradeAuthority 
    {
        // Only timelock can authorize upgrades
    }
    
    /**
     * @dev Modifier to restrict upgrade authorization to timelock
     */
    modifier onlyUpgradeAuthority() {
        require(msg.sender == upgradeAuthority, "Unauthorized upgrade");
        _;
    }

    /**
     * @dev Storage gap for future upgrades
     * Reduced by 1 slot to account for upgradeAuthority variable
     */
    uint256[49] private __gap;
}