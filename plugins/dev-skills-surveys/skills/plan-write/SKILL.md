---
name: plan-write
description: Write the implementation plan file based on the current investigation findings. Use this immediately after investigation is confirmed — creates the .ai/plans/{id}-{slug}.md file with context, root cause, repos involved, files to modify, implementation steps, and verification instructions.
---

Write the implementation plan file based on the current investigation findings.

Takes a work item ID as `$ARGUMENTS`.

## 1 — Check for an existing plan

Look for `.ai/plans/{id}-*.md`. If one exists, ask:
> "A plan already exists for #{id} (`{filename}`). OK to delete it and start fresh?"

If confirmed: delete the existing file and continue.
If not confirmed: stop.

## 2 — Derive slug

Create a short slug from the work item title: lowercase, max 5 words, hyphen-separated (e.g. `vt-image-missing`).

## 3 — Confirm findings

Summarise the investigation from context and ask: "Does this look right? Any corrections before I write the plan?"

Wait for confirmation and incorporate feedback.

## 4 — Write the plan

Create `.ai/plans/` if it does not exist. Write `.ai/plans/{id}-{slug}.md`:

- **Context**: what the work item is about and why the change is needed
- **Repos involved**: which repos need changes and what
- **Root cause / design decision**
- **Files to modify**: specific paths and line numbers
- **Implementation steps**: concrete, ordered, code-level detail
- **Verification**: how to test the change

Open the file in the editor:
```
code .ai/plans/{id}-{slug}.md 2>$null; if ($LASTEXITCODE -ne 0) { start .ai/plans/{id}-{slug}.md }
```

Output the plan file path clearly so the next step can use it.
