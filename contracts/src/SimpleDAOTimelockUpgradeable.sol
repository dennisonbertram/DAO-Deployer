// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {TimelockControllerUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title SimpleDAOTimelockUpgradeable
 * @dev Upgradeable timelock controller for DAO governance
 * Uses UUPS pattern for individual DAO control over upgrades
 * Each DAO can upgrade their timelock through governance voting
 */
contract SimpleDAOTimelockUpgradeable is 
    Initializable,
    TimelockControllerUpgradeable, 
    UUPSUpgradeable 
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the timelock controller
     * @param minDelay Initial minimum delay for operations
     * @param proposers List of addresses that can propose operations (typically governor)
     * @param executors List of addresses that can execute operations (typically address(0) for open execution)
     * @param admin Initial admin (typically deployer, should be transferred to governor)
     */
    function initialize(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) public virtual override initializer {
        __TimelockController_init(minDelay, proposers, executors, admin);
        __UUPSUpgradeable_init();
    }

    /**
     * @dev Authorize upgrade - only self can upgrade (through governance execution)
     * This ensures timelock upgrades must go through the full governance process
     */
    function _authorizeUpgrade(address /* newImplementation */)
        internal
        view
        override
    {
        require(msg.sender == address(this), "Only self can upgrade");
        // Must be called through governance proposal execution
    }

    /**
     * @dev Get the current version of this contract
     * This can be incremented in upgrades to track versions
     */
    function getVersion() public pure virtual returns (string memory) {
        return "1.0.0";
    }

    /**
     * @dev Storage gap for future upgrades
     * Reduces storage size to allow for additional variables in upgrades
     */
    uint256[50] private __gap;
}