// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {NoncesUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title SimpleDAOTokenUpgradeable
 * @dev Upgradeable ERC20 token with voting capabilities, minting, and permit functionality
 * Uses UUPS pattern for individual DAO control over upgrades
 * Each DAO's timelock controls token upgrades through governance voting
 */
contract SimpleDAOTokenUpgradeable is 
    Initializable, 
    ERC20Upgradeable, 
    OwnableUpgradeable, 
    ERC20PermitUpgradeable, 
    ERC20VotesUpgradeable,
    UUPSUpgradeable 
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @dev Address authorized to upgrade this contract (typically timelock)
    address public upgradeAuthority;

    /**
     * @dev Initialize the token contract
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial token supply to mint to recipient
     * @param recipient Address to receive initial supply
     * @param owner Address that will own the contract (typically the timelock)
     * @param _upgradeAuthority Address that can authorize upgrades (typically timelock)
     */
    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address recipient,
        address owner,
        address _upgradeAuthority
    ) public initializer {
        __ERC20_init(name, symbol);
        __Ownable_init(owner);
        __ERC20Permit_init(name);
        __ERC20Votes_init();
        // Note: UUPSUpgradeable doesn't require initialization in OZ v5
        
        upgradeAuthority = _upgradeAuthority;
        
        if (initialSupply > 0 && recipient != address(0)) {
            _mint(recipient, initialSupply);
        }
    }

    /**
     * @dev Mint new tokens - only callable by owner (typically timelock via governance)
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Returns the current timestamp for voting power snapshots
     */
    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }

    /**
     * @dev Returns the clock mode for voting power tracking
     */
    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }

    // The following functions are overrides required by Solidity.

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20VotesUpgradeable)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20PermitUpgradeable, NoncesUpgradeable)
        returns (uint256)
    {
        return super.nonces(owner);
    }

    /**
     * @dev Authorize upgrade - only upgrade authority (timelock) can authorize
     * This ensures all token upgrades go through governance process
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