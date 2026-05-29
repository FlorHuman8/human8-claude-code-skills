# Bug repro steps template

Use for **`reproStepsField`** (`Microsoft.VSTS.TCM.ReproSteps`) with **`format: "Html"`** on create. Do **not** put repro-only content in `System.Description`.

## Structure

Match how InSites bugs store repro (ordered list + divs for expected/actual/video):

```html
<ol>
<li>{step 1}</li>
<li>{step 2}</li>
</ol>
<div>Expected: {expected text}</div>
<div>Actual: {actual text}</div>
<div><br></div>
<div>Video: {video URL as plain text, link as <a href="...">...</a>, or None}</div>
```

## Rules

- One `<li>` per numbered step from the user; preserve step text (fix obvious typos only, e.g. “Swith” → “Switch”).
- **Expected** and **Actual** are required when the user provides them; use `TBD` only if truly missing after asking.
- **Video** line always present: URL, `None`, or `N/A`.
- Escape HTML in step text (`&` → `&amp;`, `<` → `&lt;`) when not using intentional markup.
- Omit `System.Description` on create unless `wit_get_work_item_type` marks it `alwaysRequired`.
