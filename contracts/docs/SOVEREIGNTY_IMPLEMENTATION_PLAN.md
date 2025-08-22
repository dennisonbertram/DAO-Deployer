# True DAO Sovereignty Implementation Plan

## Problem Statement
Current hybrid proxy design creates critical security vulnerability where factory owner can upgrade all DAO governors simultaneously, potentially compromising all DAOs through malicious governor implementations.

## Target Architecture: Full UUPS Sovereignty

### Proxy Pattern Changes
- **Token**: BeaconProxy → UUPS Proxy ✅ DAO controlled
- **Governor**: BeaconProxy → UUPS Proxy ✅ DAO controlled  
- **Timelock**: UUPS Proxy (no change) ✅ DAO controlled

### Upgrade Authority Model
**Centralized DAO Authority**: Timelock controls upgrades for all three contracts
- Token upgrades: Authorized by timelock (through governance)
- Governor upgrades: Authorized by timelock (through governance)
- Timelock upgrades: Authorized by timelock (self-upgrade through governance)

## Implementation Strategy

### Phase 1: Contract Modifications

#### 1.1 Update SimpleDAOTokenUpgradeable
```solidity
// Add UUPS upgrade authorization
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract SimpleDAOTokenUpgradeable is 
    Initializable,
    ERC20Upgradeable,
    ERC20PermitUpgradeable,
    ERC20VotesUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable  // ADD THIS
{
    address public upgradeAuthority; // Timelock address
    
    function initialize(..., address _upgradeAuthority) public initializer {
        // existing initialization...
        upgradeAuthority = _upgradeAuthority;
    }
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyUpgradeAuthority 
    {
        // Only timelock can authorize upgrades
    }
    
    modifier onlyUpgradeAuthority() {
        require(msg.sender == upgradeAuthority, "Unauthorized upgrade");
        _;
    }
}
```

#### 1.2 Update SimpleDAOGovernorUpgradeable  
```solidity
// Add UUPS upgrade authorization (same pattern as token)
contract SimpleDAOGovernorUpgradeable is 
    // existing inheritance...
    UUPSUpgradeable  // ADD THIS
{
    address public upgradeAuthority; // Timelock address
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyUpgradeAuthority 
    {
        // Only timelock can authorize upgrades
    }
}
```

#### 1.3 Update SimpleDAOTimelockUpgradeable
```solidity
// Change authorization from role-based to self-authorization
function _authorizeUpgrade(address newImplementation)
    internal
    override
{
    require(msg.sender == address(this), "Only self can upgrade");
    // Must be called through governance proposal execution
}
```

### Phase 2: Factory Modifications

#### 2.1 Remove Beacon Infrastructure
```solidity
contract SimpleDAOFactoryV2 is Ownable {
    // REMOVE: UpgradeableBeacon public immutable tokenBeacon;
    // REMOVE: UpgradeableBeacon public immutable governorBeacon;
    
    address public immutable tokenImplementation;
    address public immutable governorImplementation;
    address public immutable timelockImplementation;
    
    constructor(
        address _tokenImpl,
        address _governorImpl, 
        address _timelockImpl
    ) Ownable(msg.sender) {
        tokenImplementation = _tokenImpl;
        governorImplementation = _governorImpl;
        timelockImplementation = _timelockImpl;
    }
    
    // REMOVE: upgradeAllTokens()
    // REMOVE: upgradeAllGovernors() 
    // REMOVE: beacon management functions
}
```

#### 2.2 Update Deployment Functions
```solidity
function _deployToken(...) internal returns (address) {
    return address(new ERC1967Proxy(
        tokenImplementation,
        abi.encodeCall(
            SimpleDAOTokenUpgradeable.initialize,
            (
                config.tokenName,
                config.tokenSymbol, 
                config.initialSupply,
                recipient,
                timelock,  // owner
                timelock   // upgradeAuthority - ADD THIS
            )
        )
    ));
}

function _deployGovernor(...) internal returns (address) {
    return address(new ERC1967Proxy(
        governorImplementation,
        abi.encodeCall(
            SimpleDAOGovernorUpgradeable.initialize,
            (
                governorName,
                IVotes(token),
                TimelockControllerUpgradeable(payable(timelock)),
                config.votingDelay,
                config.votingPeriod,
                config.proposalThreshold,
                config.quorumPercentage,
                timelock  // upgradeAuthority - ADD THIS
            )
        )
    ));
}
```

### Phase 3: Test Updates

#### 3.1 Remove Beacon Tests
- Remove `testBeaconProxyPattern()`
- Remove `testFactoryOwnerCanUpgradeBeacons()`
- Remove `testUpgradeAffectsAllDAOs()`

#### 3.2 Add Sovereignty Tests
```solidity
function testDAOCanUpgradeOwnToken() public {
    // Test governance proposal to upgrade token
    // Verify upgrade works through timelock
    // Verify state preservation
}

function testDAOCanUpgradeOwnGovernor() public {
    // Test governance proposal to upgrade governor
    // Verify upgrade works through timelock
    // Verify state preservation
}

function testFactoryCannotUpgradeAnything() public {
    // Verify factory owner has no upgrade capabilities
    // Verify all upgrade attempts fail
}

function testDAOsAreCompletelyIndependent() public {
    // Deploy multiple DAOs
    // Upgrade one DAO's contracts
    // Verify other DAOs are unaffected
}
```

## Implementation Checklist

### Contracts
- [ ] Add UUPSUpgradeable to token contract
- [ ] Add UUPSUpgradeable to governor contract  
- [ ] Update timelock authorization logic
- [ ] Add upgradeAuthority parameters to initialize functions
- [ ] Remove beacon infrastructure from factory
- [ ] Update factory deployment functions

### Testing
- [ ] Remove beacon-related tests
- [ ] Add DAO sovereignty upgrade tests
- [ ] Add factory powerlessness tests
- [ ] Add independence verification tests
- [ ] Test upgrade authorization security

### Security Validation
- [ ] Verify no centralized upgrade capabilities remain
- [ ] Verify each DAO controls all its upgrades
- [ ] Verify upgrade authorization cannot be bypassed
- [ ] Verify factory has no persistent control
- [ ] Test attack scenarios are prevented

## Risk Assessment

### Low Risk Changes
- Token UUPS conversion (straightforward pattern)
- Governor UUPS conversion (straightforward pattern)
- Factory beacon removal (simplification)

### Medium Risk Changes
- Timelock authorization update (self-upgrade logic)
- Initialization parameter changes (compatibility)

### Validation Strategy
- Comprehensive test coverage for all upgrade paths
- Security-focused testing for authorization bypasses
- End-to-end governance workflow testing
- Multi-DAO independence verification

## Success Criteria
1. ✅ Each DAO has complete sovereignty over all upgrades
2. ✅ Factory has zero persistent control after deployment
3. ✅ All upgrades go through proper governance process
4. ✅ DAOs cannot interfere with each other
5. ✅ No centralized upgrade attack vectors exist