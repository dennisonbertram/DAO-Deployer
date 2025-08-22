# Storage Layout Management for Upgradeable Contracts

*OpenZeppelin Contracts 5.x - Storage Layout Guide*

## Overview

Storage layout management is critical for upgradeable smart contracts. Solidity automatically assigns storage slots to state variables, and these assignments must remain consistent across contract upgrades to prevent data corruption.

## Core Principles

### 1. Append-Only Rule

**NEVER modify existing storage slots. ONLY append new variables.**

```solidity
// ✅ CORRECT - V1
contract MyDAOV1 {
    string public name;           // slot 0
    uint256 public totalSupply;   // slot 1
    mapping(address => uint256) public balances; // slot 2
}

// ✅ CORRECT - V2 (appends new variables)
contract MyDAOV2 {
    string public name;           // slot 0 (unchanged)
    uint256 public totalSupply;   // slot 1 (unchanged)
    mapping(address => uint256) public balances; // slot 2 (unchanged)
    
    // New variables - appended only
    uint256 public votingPeriod;  // slot 3
    bool public paused;           // slot 4 (packed with next var if < 32 bytes)
    address public governance;    // slot 4 (packed with bool)
}

// ❌ WRONG - Don't modify existing layout
contract MyDAOV2Wrong {
    address public governance;    // ❌ This changes slot 0!
    string public name;           // ❌ This moves to slot 1!
    uint256 public totalSupply;   // ❌ This moves to slot 2!
    mapping(address => uint256) public balances; // ❌ This moves to slot 3!
}
```

### 2. Variable Packing Considerations

Variables less than 32 bytes are packed together in storage slots:

```solidity
// V1 - Packed variables
contract MyDAOV1 {
    bool public paused;        // slot 0 (1 byte)
    address public owner;      // slot 0 (20 bytes) - packed with bool
    uint256 public totalSupply; // slot 1 (32 bytes)
}

// ✅ CORRECT - V2 maintains packing
contract MyDAOV2 {
    bool public paused;        // slot 0 (1 byte)
    address public owner;      // slot 0 (20 bytes) - same packing
    uint256 public totalSupply; // slot 1 (32 bytes)
    
    // New packed variables
    bool public upgradeable;   // slot 2 (1 byte)
    address public timelock;   // slot 2 (20 bytes) - packed with new bool
}

// ❌ WRONG - Don't insert between packed variables
contract MyDAOV2Wrong {
    bool public paused;        // slot 0 (1 byte)
    uint256 public newVar;     // ❌ This breaks packing!
    address public owner;      // ❌ This moves to new slot!
    uint256 public totalSupply; // ❌ Layout changed!
}
```

### 3. Storage Gaps Pattern

Use storage gaps to reserve space for future upgrades:

```solidity
contract MyDAOUpgradeable {
    string public name;
    uint256 public totalSupply;
    mapping(address => uint256) public balances;
    
    // Reserve 47 storage slots for future variables
    // This allows adding up to 47 new uint256-sized variables
    uint256[47] private __gap;
}

// Future upgrade can use gap space
contract MyDAOUpgradeableV2 {
    string public name;
    uint256 public totalSupply;
    mapping(address => uint256) public balances;
    
    // Use some gap space
    uint256 public votingPeriod;
    bool public paused;
    address public governance;
    
    // Reduce gap accordingly (47 - 3 slots used = 44 remaining)
    uint256[44] private __gap;
}
```

## Inheritance and Storage Layout

### Diamond Inheritance Issues

```solidity
// Base contracts
contract Ownable {
    address public owner; // slot 0
}

contract Pausable {
    bool public paused;   // slot 1
}

// ✅ CORRECT - Consistent inheritance order
contract MyDAOV1 is Ownable, Pausable {
    uint256 public totalSupply; // slot 2
}

// ✅ CORRECT - V2 maintains same inheritance order
contract MyDAOV2 is Ownable, Pausable {
    uint256 public totalSupply; // slot 2
    uint256 public votingPeriod; // slot 3
}

// ❌ WRONG - Changed inheritance order
contract MyDAOV2Wrong is Pausable, Ownable {
    // This changes the storage layout!
    uint256 public totalSupply;
}
```

### OpenZeppelin Upgradeable Contracts

OpenZeppelin provides upgradeable versions of standard contracts with proper storage gap management:

```solidity
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MyDAOUpgradeable is 
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable 
{
    uint256 public totalSupply;
    mapping(address => uint256) public balances;
    
    // Always include gap for future upgrades
    uint256[48] private __gap;
    
    function initialize(address owner) external initializer {
        __Ownable_init(owner);
        __Pausable_init();
        // Custom initialization
    }
}
```

## Complex Storage Patterns

### Mappings and Arrays

Mappings and dynamic arrays use hash-based slot calculation:

```solidity
contract StorageExample {
    uint256 public simpleVar;                    // slot 0
    mapping(address => uint256) public balances; // slot 1 (base slot)
    uint256[] public array;                      // slot 2 (length), elements at keccak256(2)
    
    // Nested mappings
    mapping(address => mapping(uint256 => bool)) public approvals; // slot 3
}

// Storage locations:
// simpleVar: slot 0
// balances[addr]: keccak256(abi.encode(addr, 1))
// array.length: slot 2
// array[i]: keccak256(2) + i
// approvals[addr][tokenId]: keccak256(abi.encode(tokenId, keccak256(abi.encode(addr, 3))))
```

### Structs

Structs are packed according to their member sizes:

```solidity
struct Proposal {
    address proposer;    // 20 bytes
    bool executed;       // 1 byte  } packed in same slot
    uint88 votesFor;     // 11 bytes}
    uint256 deadline;    // 32 bytes - next slot
}

contract GovernanceDAO {
    mapping(uint256 => Proposal) public proposals; // slot 0
    
    // New version can modify struct ONLY by appending
    struct ProposalV2 {
        address proposer;    // 20 bytes
        bool executed;       // 1 byte  
        uint88 votesFor;     // 11 bytes
        uint256 deadline;    // 32 bytes
        // ✅ Can add new fields
        uint256 votesAgainst; // 32 bytes - new slot
        bytes32 descriptionHash; // 32 bytes - new slot
    }
}
```

## ERC-7201 Namespaced Storage

For complex upgradeable contracts, use ERC-7201 to avoid storage collisions:

```solidity
import "@openzeppelin/contracts/utils/SlotDerivation.sol";

contract MyDAOWithNamespaces {
    using SlotDerivation for bytes32;
    
    // Namespace for governance data
    bytes32 private constant GOVERNANCE_NAMESPACE = 
        keccak256("myproject.governance.v1");
        
    // Namespace for token data
    bytes32 private constant TOKEN_NAMESPACE = 
        keccak256("myproject.token.v1");
    
    struct GovernanceStorage {
        uint256 proposalCount;
        mapping(uint256 => Proposal) proposals;
        uint256 votingDelay;
    }
    
    struct TokenStorage {
        uint256 totalSupply;
        mapping(address => uint256) balances;
        mapping(address => uint256) delegateVotes;
    }
    
    function _getGovernanceStorage() 
        private 
        pure 
        returns (GovernanceStorage storage $) 
    {
        bytes32 slot = GOVERNANCE_NAMESPACE.erc7201Slot();
        assembly {
            $.slot := slot
        }
    }
    
    function _getTokenStorage() 
        private 
        pure 
        returns (TokenStorage storage $) 
    {
        bytes32 slot = TOKEN_NAMESPACE.erc7201Slot();
        assembly {
            $.slot := slot
        }
    }
}
```

## Verification and Testing

### 1. Storage Layout Verification

```solidity
// Use OpenZeppelin's storage layout check
contract StorageLayoutTest {
    function testStorageLayout() external pure {
        // Get storage layout for current version
        bytes32[] memory currentLayout = _getStorageLayout();
        
        // Compare with previous version layout
        bytes32[] memory previousLayout = _getPreviousLayout();
        
        require(
            _isCompatible(currentLayout, previousLayout),
            "Storage layout incompatible"
        );
    }
}
```

### 2. Manual Verification

```solidity
contract StorageSlotChecker {
    function checkSlots() external pure {
        uint256 slot0; // Check what's in slot 0
        uint256 slot1; // Check what's in slot 1
        
        assembly {
            slot0 := sload(0)
            slot1 := sload(1)
        }
        
        // Verify expected values
    }
}
```

## Best Practices Summary

### ✅ DO

1. **Always append new variables** at the end of the contract
2. **Use storage gaps** to reserve space for future upgrades
3. **Maintain inheritance order** across upgrades
4. **Use OpenZeppelin's upgradeable contracts** for standard functionality
5. **Test storage layout compatibility** before upgrades
6. **Document storage changes** in upgrade notes
7. **Use ERC-7201 namespaced storage** for complex contracts

### ❌ DON'T

1. **Never modify existing variable positions**
2. **Never change inheritance order**
3. **Never insert variables between existing ones**
4. **Never change variable types** (unless expanding is safe)
5. **Never remove variables** (mark as deprecated instead)
6. **Never modify struct definitions** (append only)

## Migration Strategies

### Safe Variable Type Changes

```solidity
// ✅ Safe expansions
uint128 -> uint256  // Expanding size is safe
bool -> uint8       // bool is internally uint8

// ❌ Unsafe changes
uint256 -> uint128  // Truncation loses data
address -> uint160  // Different semantic meaning
string -> bytes     // Different encoding
```

### Deprecation Pattern

```solidity
contract MyDAOV2 {
    // V1 storage (keep as-is)
    uint256 private _deprecatedOldVar; // Mark as deprecated
    mapping(address => uint256) public balances;
    
    // V2 storage (new variables)
    uint256 public newImprovedVar; // Replacement for deprecated var
    
    // Provide migration function
    function migrateOldVar() external {
        if (_deprecatedOldVar != 0) {
            newImprovedVar = _deprecatedOldVar;
            _deprecatedOldVar = 0; // Clear old value
        }
    }
}
```

This comprehensive guide ensures your upgradeable DAO contracts maintain storage compatibility across all upgrades while providing flexibility for future enhancements.