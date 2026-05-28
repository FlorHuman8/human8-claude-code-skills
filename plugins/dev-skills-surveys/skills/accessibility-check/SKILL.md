---
name: accessibility-check
description: >
  Fix web accessibility issues directly in the code with inline comments explaining each change.
  Use this skill whenever the user wants to check, fix, review, audit, or improve accessibility
  in their web code — even if they don't use the word "accessibility". Trigger on phrases
  like "a11y", "WCAG", "screen reader", "keyboard navigation", "color contrast", "ARIA",
  "accessible", "ADA compliance", or "is this accessible?". Also trigger when the user says
  things like "check my HTML", "review my component", or "audit my page" in a web context,
  since accessibility is almost always part of what they care about. ALSO trigger automatically
  when the user asks to create or open a pull request (PR) and the branch contains frontend
  changes (HTML, CSS, JS, JSX, TSX, Vue, Svelte files) — run an accessibility pass on those
  files before opening the PR. Skip any report or issue list — go straight to the fixed code.
---

# Accessibility Fix Skill

Your job is to fix accessibility issues directly in the code. No report, no issue list — just return the corrected code with short inline comments on each changed line explaining what you fixed and why.

**Target standard:** WCAG 2.2 AA. Flag low-effort AAA wins where you spot them.

**Bundled reference:** `references/patterns.md` — read the relevant section when fixing interactive components (modals, forms, buttons with loading states, live regions, skip links, dynamic announcements, or mobile/touch targets).

## PR workflow

When triggered by a pull request request (e.g. "make a PR", "open a PR", "create a pull request"):

1. Run `git diff --name-only origin/main` (or the base branch) to find changed files.
2. Filter for frontend files: `.html`, `.css`, `.js`, `.jsx`, `.ts`, `.tsx`, `.vue`, `.svelte`.
3. If any exist, run the full accessibility audit on them and apply fixes (steps below) **before** opening the PR.
4. Include the accessibility fixes in the same commit or as a separate commit — your call based on scope. Mention the a11y pass in the PR description.
5. If no frontend files changed, skip this skill and proceed with the PR normally.

---

## Your process

1. **Read all relevant files** the user points you to (HTML, CSS, JS/JSX/TSX). If they paste a snippet, work with what's given.
2. **Identify all accessibility issues** across the audit areas below. For interactive component patterns (modals, forms, loading states, live regions) check `references/patterns.md`.
3. **Apply fixes directly** — if the user pointed you at real files, use the Edit tool to change them in place. If they pasted a snippet, return the full corrected code.
4. **Add a short inline comment on every changed line** in the format: `<!-- a11y: what you fixed (WCAG X.X.X) -->` for HTML or `/* a11y: what you fixed (WCAG X.X.X) */` for CSS/JS. Keep comments to one line; they should explain the *why*, not restate the code.
5. **End with a one-line summary** — e.g., "Fixed 7 issues: labels, button semantics, focus outline, 4× contrast, aria-live, alt text."

Keep comments brief and practical. A developer skimming a diff should instantly understand what changed and why.

---

## What to check and fix

### Semantic HTML & ARIA
- `<div onclick>` or `<span onclick>` used as buttons/links → replace with `<button>` or `<a href>`
- Inputs without `<label>` (placeholder is not a label) → add associated label
- Missing landmark elements (`<main>`, `<nav>`, `<header>`, `<footer>`) → add them
- Heading levels skipped or no `<h1>` → fix the hierarchy
- Icon-only buttons with no accessible name → add `aria-label`
- Inline SVGs not hidden from AT when decorative → add `aria-hidden="true" focusable="false"`
- Dynamic content updates (error messages, toasts) with no live region → add `role="alert"` or `aria-live`
- Active nav items with no `aria-current="page"` → add it
- `<html>` missing `lang` attribute → add `lang="en"` (or correct language)
- Form inputs missing `autocomplete` where applicable → add it

WCAG criteria: 1.3.1, 2.4.1, 2.4.6, 3.1.1, 4.1.2, 4.1.3

### Color contrast
- Normal text (< 18pt / < 14pt bold): must be ≥ **4.5:1** — darken the foreground color
- Large text (≥ 18pt / ≥ 14pt bold): must be ≥ **3:1**
- UI components (input borders, focus indicators, icons): must be ≥ **3:1** (WCAG 1.4.11)
- Color as the only way to convey information (e.g., red = error with no text/icon) → add a non-color cue

When fixing contrast, prefer darkening the foreground rather than changing the background. Provide the replacement hex value and the approximate new ratio in the comment: `/* a11y: #999 → #767676 for 4.6:1 contrast (WCAG 1.4.3) */`

If CSS variables or design tokens are used and you can't resolve the actual hex, add a comment flagging it: `/* a11y: verify contrast — value comes from CSS variable, check with a contrast tool */`

WCAG criteria: 1.4.1, 1.4.3, 1.4.11

### Keyboard & focus
- `tabindex="-1"` on a native interactive element that should be reachable → remove it
- `outline: none` or `outline: 0` with no replacement focus style → replace with a visible focus style
- Positive `tabindex` values → remove (they break natural tab order)
- Missing skip link → add `<a href="#main" class="skip-link">Skip to main content</a>` as first focusable element

WCAG criteria: 2.1.1, 2.1.2, 2.4.1, 2.4.7

### Images & media
- `<img>` with no `alt` attribute → add `alt=""` if decorative, or descriptive text if informative
- `<img alt="image">` or `<img alt="photo">` or `alt` = filename → replace with meaningful description
- Inline SVG icons without `aria-hidden="true"` when the parent already has an accessible name → add it

WCAG criteria: 1.1.1

---

## Comment format examples

```html
<!-- BEFORE -->
<div onclick="submit()">Submit</div>
<input type="text" placeholder="Email" />
<img src="logo.png" />

<!-- AFTER -->
<button type="submit" onclick="submit()">Submit</button> <!-- a11y: div→button for keyboard access & semantics (WCAG 4.1.2, 2.1.1) -->
<label for="email">Email</label> <!-- a11y: visible label — placeholder alone not announced by all screen readers (WCAG 1.3.1) -->
<input type="email" id="email" autocomplete="email" /> <!-- a11y: type=email + autocomplete for autofill support (WCAG 1.3.5) -->
<img src="logo.png" alt="Acme Corp" /> <!-- a11y: descriptive alt text (WCAG 1.1.1) -->
```

```css
/* BEFORE */
.label { color: #999; }
input:focus { outline: none; }

/* AFTER */
.label { color: #767676; } /* a11y: #999→#767676 for 4.6:1 contrast on white (WCAG 1.4.3) */
input:focus { outline: 2px solid #005fcc; outline-offset: 2px; } /* a11y: visible focus indicator (WCAG 2.4.7) */
```

---

## What you can't fix from static code

Some issues can't be fixed without runtime context. When you encounter them, add a comment flagging it rather than guessing:

```html
<div id="tooltip-content">...</div>
<!-- a11y: verify this is shown on both hover AND focus — mouseenter-only tooltips fail WCAG 1.4.13 -->
```

```css
.price { color: var(--color-sale); }
/* a11y: verify contrast for --color-sale against background — can't resolve CSS variable statically */
```
