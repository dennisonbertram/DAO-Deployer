# Accessibility Improvements for DAO Deployer Frontend

This document outlines comprehensive accessibility improvements following WCAG 2.1 AA standards.

## Summary of Changes

### 1. Form Accessibility (`src/app/deploy/steps/`)

All form inputs need:
- `aria-label` or associated `<label>` elements
- `aria-required="true"` for required fields
- `aria-invalid="true"` when validation fails
- `aria-describedby` linking to error messages and help text
- Unique `id` attributes for each input

### 2. Modal Accessibility (`src/components/deploy/DeploymentModal.tsx`)

- `role="dialog"` and `aria-modal="true"` on modal container
- `aria-labelledby` pointing to modal title
- `aria-describedby` pointing to modal description
- Focus trapping (focus stays within modal)
- Escape key handler to close modal
- Return focus to trigger element on close
- `aria-busy="true"` during loading states
- `aria-live="polite"` regions for status updates

### 3. Admin Page Forms (`src/app/admin/page.tsx`)

- Labels for chain ID and RPC URL inputs
- `aria-label` where visual labels aren't present
- `aria-pressed` for toggle buttons

### 4. Navigation (`src/components/WalletHeader.tsx`)

- `role="banner"` on header
- `aria-label` for navigation regions
- `aria-expanded` for dropdown menus
- Keyboard accessibility for dropdowns

### 5. Loading States

- `aria-busy="true"` during async operations
- `aria-live="polite"` for status announcements
- Screen reader-friendly loading messages

## Detailed Implementation

### BasicInfo.tsx

```typescript
// DAO Name Input (around line 82)
<input
  id="dao-name"
  type="text"
  className={`input ${getError('name') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
  placeholder="e.g., Awesome Community DAO"
  value={config.name || ''}
  onChange={(e) => handleInputChange('name', e.target.value)}
  maxLength={50}
  aria-label="DAO name"
  aria-required="true"
  aria-invalid={!!getError('name')}
  aria-describedby={getError('name') ? 'dao-name-error' : 'dao-name-help'}
/>
{getError('name') && (
  <div id="dao-name-error" className="text-sm text-red-600 mt-1" role="alert">
    {getError('name')}
  </div>
)}

// Description Textarea (around line 101)
<textarea
  id="dao-description"
  className={`input min-h-[100px] resize-none ${getError('description') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
  placeholder="Describe your DAO's purpose, goals, and community..."
  value={config.description || ''}
  onChange={(e) => handleInputChange('description', e.target.value)}
  maxLength={500}
  rows={4}
  aria-label="DAO description"
  aria-describedby="dao-description-help"
/>
<div id="dao-description-help" className="text-xs text-gray-500 mt-1">
  {config.description?.length || 0}/500 characters
</div>

// Token Name Input (around line 118)
<input
  id="token-name"
  type="text"
  className={`input ${getError('tokenName') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
  placeholder="e.g., Awesome DAO Token"
  value={config.tokenName || ''}
  onChange={(e) => handleInputChange('tokenName', e.target.value)}
  maxLength={30}
  aria-label="Token name"
  aria-required="true"
  aria-invalid={!!getError('tokenName')}
  aria-describedby={getError('tokenName') ? 'token-name-error' : undefined}
/>

// Token Symbol Input (around line 136)
<input
  id="token-symbol"
  type="text"
  className={`input uppercase ${getError('tokenSymbol') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
  placeholder="e.g., ADT"
  value={config.tokenSymbol || ''}
  onChange={(e) => handleInputChange('tokenSymbol', e.target.value.toUpperCase())}
  maxLength={10}
  aria-label="Token symbol"
  aria-required="true"
  aria-invalid={!!getError('tokenSymbol')}
  aria-describedby={getError('tokenSymbol') ? 'token-symbol-error' : undefined}
/>

// Initial Supply Input (around line 156)
<input
  id="initial-supply"
  type="number"
  className={`input ${getError('initialSupply') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
  placeholder="1000000"
  value={config.initialSupply || ''}
  onChange={(e) => handleInputChange('initialSupply', e.target.value)}
  min="0"
  step="any"
  aria-label="Initial token supply"
  aria-required="true"
  aria-invalid={!!getError('initialSupply')}
  aria-describedby={getError('initialSupply') ? 'initial-supply-error' : undefined}
/>

// Initial Recipient Input (around line 178)
<input
  id="initial-recipient"
  type="text"
  className={`input font-mono text-sm ${getError('initialRecipient') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
  placeholder="0x1234...5678"
  value={config.initialRecipient || ''}
  onChange={(e) => handleInputChange('initialRecipient', e.target.value)}
  aria-label="Initial recipient Ethereum address"
  aria-required="true"
  aria-invalid={!!getError('initialRecipient')}
  aria-describedby={getError('initialRecipient') ? 'initial-recipient-error' : undefined}
/>
```

### GovernanceParams.tsx

```typescript
// Voting Delay Input (around line 112)
<input
  id="voting-delay"
  type="number"
  className={`input ${getError('votingDelay') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
  placeholder="1800"
  value={config.votingDelay ?? ''}
  onChange={(e) => handleInputChange('votingDelay', parseInt(e.target.value) || 0)}
  min="0"
  aria-label="Voting delay in blocks"
  aria-required="true"
  aria-invalid={!!getError('votingDelay')}
  aria-describedby="voting-delay-help"
/>

// Voting Period Input (around line 139)
<input
  id="voting-period"
  type="number"
  className={`input ${getError('votingPeriod') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
  placeholder="25200"
  value={config.votingPeriod ?? ''}
  onChange={(e) => handleInputChange('votingPeriod', parseInt(e.target.value) || 0)}
  min="1"
  aria-label="Voting period in blocks"
  aria-required="true"
  aria-invalid={!!getError('votingPeriod')}
  aria-describedby="voting-period-help"
/>

// Proposal Threshold Input (around line 168)
<input
  id="proposal-threshold"
  type="number"
  className={`input ${getError('proposalThreshold') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
  placeholder="1000"
  value={config.proposalThreshold || ''}
  onChange={(e) => handleInputChange('proposalThreshold', e.target.value)}
  min="0"
  step="any"
  aria-label="Proposal threshold in tokens"
  aria-required="true"
  aria-invalid={!!getError('proposalThreshold')}
  aria-describedby="proposal-threshold-help"
/>

// Quorum Percentage Input (around line 196)
<input
  id="quorum-percentage"
  type="number"
  className={`input ${getError('quorumPercentage') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
  placeholder="10"
  value={config.quorumPercentage ?? ''}
  onChange={(e) => handleInputChange('quorumPercentage', parseFloat(e.target.value) || 0)}
  min="0.1"
  max="100"
  step="0.1"
  aria-label="Quorum percentage"
  aria-required="true"
  aria-invalid={!!getError('quorumPercentage')}
  aria-describedby="quorum-percentage-help"
/>

// Timelock Delay Input (around line 226)
<input
  id="timelock-delay"
  type="number"
  className={`input ${getError('timelockDelay') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
  placeholder="86400"
  value={config.timelockDelay ?? ''}
  onChange={(e) => handleInputChange('timelockDelay', parseInt(e.target.value) || 0)}
  min="0"
  aria-label="Timelock delay in seconds"
  aria-required="true"
  aria-invalid={!!getError('timelockDelay')}
  aria-describedby="timelock-delay-help"
/>
```

### AdvancedSettings.tsx

```typescript
// Network Selection Radio Buttons (around line 76)
<input
  type="radio"
  id={`network-${network.id}`}
  name="network"
  value={network.id}
  checked={config.network === network.id}
  onChange={(e) => handleInputChange('network', e.target.value)}
  className="sr-only"
  aria-label={`Deploy to ${network.name} network`}
/>

// Gas Optimization Radio Buttons (around line 124)
<input
  type="radio"
  id={`gas-${option.id}`}
  name="gasOptimization"
  value={option.id}
  checked={config.gasOptimization === option.id}
  onChange={(e) => handleInputChange('gasOptimization', e.target.value as any)}
  className="mt-1"
  aria-label={`${option.name}: ${option.description}`}
/>

// Custom Gas Price Input (around line 147)
<input
  id="custom-gas-price"
  type="number"
  className={`input ${getError('customGasPrice') ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
  placeholder="20"
  value={config.customGasPrice || ''}
  onChange={(e) => handleInputChange('customGasPrice', e.target.value)}
  min="1"
  step="0.1"
  aria-label="Custom gas price in Gwei"
  aria-required="true"
  aria-invalid={!!getError('customGasPrice')}
  aria-describedby={getError('customGasPrice') ? 'custom-gas-error' : undefined}
/>

// Checkboxes (around line 172-202)
<input
  id="gasless-voting"
  type="checkbox"
  checked={config.enableGaslessVoting || false}
  onChange={(e) => handleInputChange('enableGaslessVoting', e.target.checked)}
  className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
  aria-label="Enable gasless voting"
  aria-describedby="gasless-voting-description"
/>
<label htmlFor="gasless-voting" className="ml-3">
  <h4 className="text-sm font-medium text-gray-900">Enable Gasless Voting</h4>
  <p id="gasless-voting-description" className="text-sm text-gray-600">
    Allow users to vote without paying gas fees using meta-transactions
  </p>
</label>
```

### admin/page.tsx

```typescript
// Network Name Input (around line 434)
<label htmlFor="network-name" className="block text-sm font-medium text-gray-700 mb-1">
  Network Name
</label>
<input
  id="network-name"
  type="text"
  value={customNetworkInfo.name || ''}
  onChange={(e) => handleNetworkInfoChange('name', e.target.value)}
  className="w-full px-3 py-2 border border-gray-300 rounded-md"
  aria-label="Network name"
/>

// Chain ID Display (around line 446) - already has label, just needs aria-label for screen readers
<label htmlFor="chain-id" className="block text-sm font-medium text-gray-700 mb-1">
  Chain ID
</label>
<p id="chain-id" className="text-gray-900" aria-label={`Chain ID: ${networkInfo.chainId}`}>
  {networkInfo.chainId}
</p>

// RPC URL Input (around line 467)
<label htmlFor="rpc-url" className="block text-sm font-medium text-gray-700 mb-1">
  RPC URL
</label>
<input
  id="rpc-url"
  type="text"
  value={customNetworkInfo.rpcUrls?.default.http[0] || ''}
  onChange={(e) => handleNetworkInfoChange('rpcUrls', {
    default: { http: [e.target.value] }
  })}
  className="w-full px-3 py-2 border border-gray-300 rounded-md"
  aria-label="RPC URL for network connection"
/>

// Testnet Only Mode Toggle (around line 372)
<label htmlFor="testnet-toggle" className="text-sm font-medium text-gray-700">
  Testnet Only Mode
</label>
<button
  id="testnet-toggle"
  onClick={() => setTestnetOnlyMode(!testnetOnlyMode)}
  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
    testnetOnlyMode ? 'bg-green-600' : 'bg-gray-200'
  }`}
  role="switch"
  aria-checked={testnetOnlyMode}
  aria-label="Toggle testnet only mode"
>
  <span
    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
      testnetOnlyMode ? 'translate-x-6' : 'translate-x-1'
    }`}
  />
</button>
```

### WalletHeader.tsx

```typescript
// Header (around line 316)
<header
  className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  role="banner"
>

// Network Selector Button (around line 146)
<Button
  variant="outline"
  onClick={() => setIsOpen(!isOpen)}
  className="gap-2"
  aria-label="Network selector"
  aria-expanded={isOpen}
  aria-haspopup="true"
>
  <span className="text-sm font-medium">
    {currentChain?.name || 'Unknown Network'}
  </span>
  <ChevronDownIcon className="w-4 h-4" aria-hidden="true" />
</Button>

// Network Options Menu (around line 158)
<div
  className="absolute top-full left-0 mt-2 z-50 min-w-[220px] rounded-md border bg-popover text-popover-foreground shadow-md"
  role="menu"
  aria-label="Available networks"
>

// Individual Network Button (around line 161)
<button
  key={chain.id}
  onClick={() => {
    onNetworkSwitch(chain.id);
    setIsOpen(false);
  }}
  className={cn(
    "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
    currentChainId === chain.id && "bg-accent/60 text-foreground"
  )}
  role="menuitem"
  aria-label={`Switch to ${chain.name} network`}
>
  {chain.name}
</button>

// Dev Funding Button (around line 256)
<button
  onClick={handleFundWallet}
  disabled={isLoading}
  className={cn(
    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
    "bg-green-600 hover:bg-green-700 text-white",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  )}
  title="Fund wallet with 100 ETH from Anvil (Development only)"
  aria-label="Fund wallet with 100 test ETH from local Anvil node"
  aria-busy={isLoading}
>
  {isLoading ? (
    <>
      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      <span>Funding...</span>
    </>
  ) : (
    <>
      <BanknotesIcon className="w-4 h-4" aria-hidden="true" />
      <span>Fund 100 ETH</span>
    </>
  )}
</button>

// Custom Network Form Inputs (around line 61-116)
<label htmlFor="custom-network-name" className="block text-sm font-medium mb-1">
  Network Name
</label>
<input
  id="custom-network-name"
  type="text"
  value={formData.name}
  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
  className="w-full border rounded-md px-3 py-2"
  placeholder="Custom Network"
  required
  aria-label="Custom network name"
  aria-required="true"
/>

<label htmlFor="custom-chain-id" className="block text-sm font-medium mb-1">
  Chain ID
</label>
<input
  id="custom-chain-id"
  type="number"
  value={formData.chainId}
  onChange={(e) => setFormData(prev => ({ ...prev, chainId: e.target.value }))}
  className="w-full border rounded-md px-3 py-2"
  placeholder="1234"
  required
  aria-label="Network chain ID"
  aria-required="true"
/>

<label htmlFor="custom-rpc-url" className="block text-sm font-medium mb-1">
  RPC URL
</label>
<input
  id="custom-rpc-url"
  type="url"
  value={formData.rpcUrl}
  onChange={(e) => setFormData(prev => ({ ...prev, rpcUrl: e.target.value }))}
  className="w-full border rounded-md px-3 py-2"
  placeholder="https://rpc.example.com"
  required
  aria-label="Network RPC URL"
  aria-required="true"
/>

<label htmlFor="custom-currency-symbol" className="block text-sm font-medium mb-1">
  Currency Symbol
</label>
<input
  id="custom-currency-symbol"
  type="text"
  value={formData.symbol}
  onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
  className="w-full border rounded-md px-3 py-2"
  placeholder="ETH"
  required
  aria-label="Network currency symbol"
  aria-required="true"
/>

<label htmlFor="custom-block-explorer" className="block text-sm font-medium mb-1">
  Block Explorer URL (Optional)
</label>
<input
  id="custom-block-explorer"
  type="url"
  value={formData.blockExplorer}
  onChange={(e) => setFormData(prev => ({ ...prev, blockExplorer: e.target.value }))}
  className="w-full border rounded-md px-3 py-2"
  placeholder="https://explorer.example.com"
  aria-label="Block explorer URL (optional)"
/>
```

## Testing Checklist

After applying these changes:

### Keyboard Navigation
- [ ] Tab through all form fields in order
- [ ] All interactive elements focusable
- [ ] Focus indicators visible
- [ ] Escape closes modals
- [ ] Enter submits forms

### Screen Reader
- [ ] All form fields announced with labels
- [ ] Required fields announced as required
- [ ] Error messages announced
- [ ] Loading states announced
- [ ] Modal properly announced
- [ ] Navigation landmarks work

### Visual
- [ ] Error states visible (red borders)
- [ ] Focus states visible (blue rings)
- [ ] Color contrast meets WCAG AA (4.5:1 for text)

### Validation
- [ ] Run axe DevTools
- [ ] Run WAVE browser extension
- [ ] Run Lighthouse accessibility audit
- [ ] Test with NVDA/JAWS screen reader

## TypeScript Verification

Run type checking after changes:
```bash
npm run type-check
```

## Additional Improvements

### FormField Component
Consider updating the FormField component to automatically add ARIA attributes:

```typescript
// src/components/deploy/FormField.tsx
export default function FormField({
  label,
  error,
  required,
  children,
  description,
  tooltip,
  id // Add id prop
}: FormFieldProps) {
  const errorId = id ? `${id}-error` : undefined;
  const descriptionId = id ? `${id}-description` : undefined;

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}

      {description && (
        <p id={descriptionId} className="text-sm text-gray-600 mb-2">
          {description}
        </p>
      )}

      {children}

      {error && (
        <div id={errorId} className="text-sm text-red-600 mt-1" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
```

## Color Contrast Verification

Ensure all text meets WCAG AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text (18pt+): 3:1 contrast ratio
- UI components: 3:1 contrast ratio

Use tools like:
- WebAIM Contrast Checker
- Chrome DevTools Contrast Checker
- Lighthouse Accessibility Audit
