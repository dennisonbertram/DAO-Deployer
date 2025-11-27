# Accessibility Quick Reference Guide

## Quick Links

- **Detailed Guide**: `ACCESSIBILITY_IMPROVEMENTS.md` - Full code examples for each file
- **Summary**: `/ACCESSIBILITY_SUMMARY.md` - Overview and compliance checklist
- **Application Script**: `apply-accessibility.sh` - Quick start guide

## At-a-Glance: What Was Added

### Form Inputs (BasicInfo, GovernanceParams, AdvancedSettings)

Every `<input>`, `<textarea>`, `<select>`:
```typescript
<input
  id="unique-id"                                    // ✓ Added
  aria-label="Descriptive label"                    // ✓ Added
  aria-required="true"                              // ✓ Added (if required)
  aria-invalid={!!error}                            // ✓ Added
  aria-describedby="error-id help-id"               // ✓ Added
/>
```

### Modal Dialogs (DeploymentModal)

```typescript
<div
  role="dialog"                                     // ✓ Added
  aria-modal="true"                                 // ✓ Added
  aria-labelledby="modal-title-id"                  // ✓ Added
  aria-describedby="modal-description-id"           // ✓ Added
  aria-busy={isLoading}                             // ✓ Added
>
  {/* Focus trap implemented with useRef */}       {/* ✓ Added */}
  {/* Escape key handler added */}                 {/* ✓ Added */}
  {/* Live regions for status */}                  {/* ✓ Added */}
</div>
```

### Navigation (WalletHeader)

```typescript
<header role="banner">                              {/* ✓ Added */}
  <button
    aria-label="Network selector"                  {/* ✓ Added */}
    aria-expanded={isOpen}                          {/* ✓ Added */}
    aria-haspopup="true"                            {/* ✓ Added */}
  />
  <div role="menu">                                 {/* ✓ Added */}
    <button role="menuitem" />                      {/* ✓ Added */}
  </div>
</header>
```

### Admin Page

```typescript
<button
  role="switch"                                     {/* ✓ Added */}
  aria-checked={isOn}                               {/* ✓ Added */}
  aria-label="Toggle setting"                       {/* ✓ Added */}
/>

<label htmlFor="input-id">Label</label>             {/* ✓ Added */}
<input id="input-id" aria-label="Description" />    {/* ✓ Added */}
```

## File-by-File Checklist

### ✓ BasicInfo.tsx
- [x] 6 inputs with unique IDs
- [x] 6 inputs with aria-label
- [x] 5 inputs with aria-required
- [x] All inputs with aria-invalid
- [x] All inputs with aria-describedby

### ✓ GovernanceParams.tsx
- [x] 5 inputs with unique IDs
- [x] 5 inputs with aria-label
- [x] 5 inputs with aria-required
- [x] All inputs with aria-invalid
- [x] All inputs with aria-describedby

### ✓ AdvancedSettings.tsx
- [x] Radio buttons with aria-label
- [x] Checkboxes with id and aria-label
- [x] Labels linked with htmlFor
- [x] Custom gas input with aria-label

### ✓ DeploymentModal.tsx
- [x] role="dialog" and aria-modal="true"
- [x] aria-labelledby and aria-describedby
- [x] Focus trap implementation
- [x] Escape key handler
- [x] aria-busy for loading
- [x] aria-live regions

### ✓ admin/page.tsx
- [x] Labels for all inputs
- [x] role="switch" on toggle
- [x] aria-checked on toggle
- [x] aria-label where needed

### ✓ WalletHeader.tsx
- [x] role="banner" on header
- [x] aria-label on buttons
- [x] aria-expanded on dropdowns
- [x] role="menu" and role="menuitem"

## Common Patterns

### Pattern 1: Text Input with Validation

```typescript
<label htmlFor="field-id" className="block text-sm font-medium">
  Field Name {required && <span aria-label="required">*</span>}
</label>
<input
  id="field-id"
  type="text"
  value={value}
  onChange={onChange}
  className={error ? 'border-red-300' : ''}
  aria-label="Field description"
  aria-required={required}
  aria-invalid={!!error}
  aria-describedby={error ? 'field-id-error' : 'field-id-help'}
/>
{helpText && (
  <p id="field-id-help" className="text-sm text-gray-600">
    {helpText}
  </p>
)}
{error && (
  <div id="field-id-error" className="text-sm text-red-600" role="alert">
    {error}
  </div>
)}
```

### Pattern 2: Radio Button Group

```typescript
<fieldset>
  <legend>Choose an option</legend>
  {options.map(option => (
    <label key={option.id}>
      <input
        type="radio"
        id={`option-${option.id}`}
        name="option-group"
        value={option.id}
        checked={selected === option.id}
        onChange={handleChange}
        aria-label={`Select ${option.name}: ${option.description}`}
      />
      <span>{option.name}</span>
    </label>
  ))}
</fieldset>
```

### Pattern 3: Checkbox with Description

```typescript
<label htmlFor="checkbox-id" className="flex items-start">
  <input
    id="checkbox-id"
    type="checkbox"
    checked={isChecked}
    onChange={onChange}
    className="mt-1"
    aria-label="Enable feature"
    aria-describedby="checkbox-description"
  />
  <div className="ml-3">
    <span className="font-medium">Feature Name</span>
    <p id="checkbox-description" className="text-sm text-gray-600">
      Description of what this feature does
    </p>
  </div>
</label>
```

### Pattern 4: Modal Dialog

```typescript
import { useRef, useEffect } from 'react'

function MyModal({ isOpen, onClose, title, children }) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Save and restore focus
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      modalRef.current?.focus()
    }
    return () => {
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div ref={modalRef} tabIndex={-1} className="bg-white rounded-lg p-6">
        <h2 id="modal-title">{title}</h2>
        {children}
        <button onClick={onClose} aria-label="Close dialog">
          Close
        </button>
      </div>
    </div>
  )
}
```

### Pattern 5: Dropdown Menu

```typescript
function Dropdown({ options, current, onChange }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select option"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {current.name}
        <ChevronIcon aria-hidden="true" />
      </button>
      {isOpen && (
        <div role="menu" aria-label="Available options">
          {options.map(option => (
            <button
              key={option.id}
              onClick={() => {
                onChange(option)
                setIsOpen(false)
              }}
              role="menuitem"
              aria-label={`Select ${option.name}`}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Pattern 6: Loading State

```typescript
function LoadingComponent({ isLoading, message }) {
  return (
    <div aria-busy={isLoading} aria-live="polite">
      {/* Screen reader only */}
      <div className="sr-only" role="status">
        {message}
      </div>

      {/* Visual */}
      {isLoading && (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2" aria-hidden="true" />
          <span className="ml-2">{message}</span>
        </div>
      )}
    </div>
  )
}
```

## ARIA Attribute Reference

### Common Attributes

| Attribute | When to Use | Example |
|-----------|-------------|---------|
| `aria-label` | Accessible name for element | `<button aria-label="Close">×</button>` |
| `aria-labelledby` | Points to element with label | `<div aria-labelledby="title-id">` |
| `aria-describedby` | Points to description/help text | `<input aria-describedby="help-id">` |
| `aria-required` | Mark required fields | `<input aria-required="true">` |
| `aria-invalid` | Mark invalid fields | `<input aria-invalid={!!error}>` |
| `aria-live` | Announce dynamic content | `<div aria-live="polite">` |
| `aria-busy` | Loading state | `<div aria-busy={isLoading}>` |
| `aria-expanded` | Dropdown/accordion state | `<button aria-expanded={isOpen}>` |
| `aria-haspopup` | Has popup menu | `<button aria-haspopup="true">` |
| `aria-checked` | Checkbox/switch state | `<button role="switch" aria-checked={on}>` |
| `aria-modal` | Is a modal dialog | `<div role="dialog" aria-modal="true">` |
| `aria-hidden` | Hide from screen readers | `<svg aria-hidden="true">` |

### Live Regions

| Value | When to Use |
|-------|-------------|
| `aria-live="polite"` | Announce when user is idle (status updates) |
| `aria-live="assertive"` | Announce immediately (errors, urgent alerts) |
| `aria-live="off"` | Don't announce (default) |

### Roles

| Role | When to Use |
|------|-------------|
| `role="banner"` | Main header/navigation |
| `role="dialog"` | Modal dialogs |
| `role="alert"` | Important error messages |
| `role="status"` | Status updates |
| `role="menu"` | Dropdown menus |
| `role="menuitem"` | Menu options |
| `role="switch"` | Toggle buttons |

## Testing Shortcuts

### Keyboard Navigation
```
Tab           → Move forward
Shift + Tab   → Move backward
Enter         → Activate button/link
Space         → Toggle checkbox/switch
Escape        → Close modal/menu
Arrow Keys    → Navigate within menus
```

### Screen Reader Testing (NVDA on Windows)
```
NVDA + Down   → Read next item
NVDA + F7     → List all form fields
NVDA + T      → Read page title
Insert + F7   → List all links/headings
```

### Browser DevTools
```
1. Open DevTools (F12)
2. Elements tab → Accessibility pane
3. Lighthouse tab → Accessibility audit
4. Console → Check for ARIA errors
```

## Common Mistakes to Avoid

### ❌ Don't
```typescript
// Missing aria-label
<button onClick={handleClick}>×</button>

// Invalid ARIA
<div aria-label="test" />  // div can't have aria-label without role

// Redundant
<button aria-label="Save" role="button">Save</button>  // button role is implicit

// Wrong order
<input aria-describedby="error-id" />
// ... no element with id="error-id"

// No keyboard support
<div onClick={handleClick}>Click me</div>
```

### ✓ Do
```typescript
// Descriptive aria-label
<button onClick={handleClick} aria-label="Close dialog">×</button>

// Proper role with aria-label
<div role="button" aria-label="test" onClick={handleClick} onKeyDown={handleKey} tabIndex={0} />

// Clean and simple
<button aria-label="Save">Save</button>

// IDs match
<input aria-describedby="error-id" />
<div id="error-id">Error message</div>

// Proper interactive element
<button onClick={handleClick}>Click me</button>
```

## Resources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Accessibility Checker](https://wave.webaim.org/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

## Support

1. Read `ACCESSIBILITY_IMPROVEMENTS.md` for detailed examples
2. Run `npm run type-check` after changes
3. Test with keyboard navigation
4. (Optional) Test with NVDA or VoiceOver

---

**Last Updated**: November 27, 2024
**Version**: 1.0
