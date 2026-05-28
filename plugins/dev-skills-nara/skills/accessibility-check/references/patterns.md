# Accessibility Patterns Reference

Reusable accessible component patterns in React/TypeScript. Read the relevant section when fixing interactive components, forms, modals, or dynamic content.

---

## Accessible Button (loading state)

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

function AccessibleButton({ children, variant = 'primary', isLoading = false, disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
      className={cn(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'min-h-[44px] min-w-[44px]', // WCAG 2.5.8: minimum 24x24px; AAA target is 44x44px
        (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="sr-only">Loading</span>
          <Spinner aria-hidden="true" />
        </>
      ) : children}
    </button>
  );
}
```

---

## Modal Dialog (focus trapping, Escape key, scroll lock)

```tsx
import { FocusTrap } from '@headlessui/react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function AccessibleDialog({ isOpen, onClose, title, children }: DialogProps) {
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <FocusTrap>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            <div id={descriptionId}>{children}</div>
            <button onClick={onClose} className="absolute top-4 right-4" aria-label="Close dialog">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
```

---

## Accessible Form (error summary, aria-invalid, field hints)

```tsx
function AccessibleForm() {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  return (
    <form aria-describedby="form-errors" noValidate>
      {/* Error summary — announced on submit, links to each field */}
      {Object.keys(errors).length > 0 && (
        <div id="form-errors" role="alert" aria-live="assertive" className="...">
          <h2>Please fix the following errors:</h2>
          <ul>
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}><a href={`#${field}`}>{message}</a></li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label htmlFor="email">
          Email address
          <span aria-hidden="true" className="text-destructive"> *</span>
          <span className="sr-only">(required)</span>
        </label>
        <input
          id="email"
          type="email"
          required
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : 'email-hint'}
        />
        {errors.email
          ? <p id="email-error" role="alert">{errors.email}</p>
          : <p id="email-hint" className="text-sm text-muted-foreground">We'll never share your email.</p>
        }
      </div>
    </form>
  );
}
```

---

## Skip Navigation Link

```tsx
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-primary"
    >
      Skip to main content
    </a>
  );
}

// In layout — skip link must be the FIRST focusable element
function Layout({ children }) {
  return (
    <>
      <SkipLink />
      <header>...</header>
      <nav aria-label="Main navigation">...</nav>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <footer>...</footer>
    </>
  );
}
```

---

## Live Region for Dynamic Announcements

```tsx
function useAnnounce() {
  const [message, setMessage] = React.useState('');

  const announce = React.useCallback((text: string) => {
    setMessage(''); // clear first so re-announcement fires
    setTimeout(() => setMessage(text), 100);
  }, []);

  const Announcer = () => (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );

  return { announce, Announcer };
}

// Usage: search results count, cart updates, toast messages
function SearchResults({ results, isLoading }) {
  const { announce, Announcer } = useAnnounce();
  React.useEffect(() => {
    if (!isLoading && results) announce(`${results.length} results found`);
  }, [results, isLoading]);

  return (
    <>
      <Announcer />
      <ul>{/* results */}</ul>
    </>
  );
}
```

---

## Contrast Ratio Utility

```typescript
function getLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) / 255, g = ((rgb >> 8) & 0xff) / 255, b = (rgb & 0xff) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(fg: string, bg: string): number {
  const L1 = getLuminance(fg), L2 = getLuminance(bg);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

// Thresholds
// Normal text (<18pt / <14pt bold):  AA = 4.5, AAA = 7.0
// Large text  (>=18pt / >=14pt bold): AA = 3.0, AAA = 4.5
// UI components & icons:              AA = 3.0
```

---

## WCAG 2.2 Criteria Quick Reference

| Level | ID     | Requirement |
|-------|--------|-------------|
| A     | 1.1.1  | Non-text content has text alternative |
| A     | 1.3.1  | Info and relationships programmatically determinable |
| A     | 2.1.1  | All functionality keyboard accessible |
| A     | 2.4.1  | Skip to main content mechanism |
| A     | 4.1.2  | Name, role, value for UI components |
| AA    | 1.4.3  | Text contrast ≥ 4.5:1 (normal), 3:1 (large) |
| AA    | 1.4.11 | UI component contrast ≥ 3:1 |
| AA    | 2.4.7  | Focus visible |
| AA    | 2.5.8  | Touch target ≥ 24×24px (new in 2.2) |
| AAA   | 1.4.6  | Enhanced contrast ≥ 7:1 |
| AAA   | 2.5.5  | Touch target ≥ 44×44px |

---

## Mobile Accessibility

- **Touch targets**: minimum 24×24px (AA, 2.5.8); prefer 44×44dp (AAA, 2.5.5)
- **Dynamic Type**: don't clip text when OS font size is increased; use relative units (`rem`, `em`)
- **VoiceOver (iOS)**: test swipe navigation; ensure custom gestures have alternatives
- **TalkBack (Android)**: test explore-by-touch; verify focus order matches visual layout
- **Gesture alternatives**: any drag/swipe action must have a single-pointer alternative

---

## Motion & Contrast Preferences

```css
/* Respect reduced motion — no auto-playing or looping animations */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* High contrast mode support */
@media (prefers-contrast: more) {
  :root {
    --border-color: ButtonText;
    --focus-ring: Highlight;
  }
}
```

---

## Testing Checklist

- **Automated**: axe DevTools, WAVE, Lighthouse
- **Keyboard only**: Tab through everything; check focus visibility and order
- **Screen reader**: VoiceOver (macOS/iOS), NVDA + Chrome (Windows), TalkBack (Android)
- **Zoom**: verify at 200% and 400% zoom, no horizontal scroll required
- **Preferences**: test with `prefers-reduced-motion` and `prefers-contrast: more` enabled
