---
name: git-commit
description: Stage and commit changes for a work item. Use this after implementation is verified to review the diff, stage only the relevant files (never git add -A), and create a correctly-formatted commit message referencing the work item ID.
---

Stage and commit changes for a work item.

Takes a work item ID as `$ARGUMENTS`. Read `.ai/plans/{id}-*.md` for context on what changed.

## Steps

1. Review the diff (`git diff`) to confirm only intended files are changed.
2. Stage only the relevant files — never `git add -A` or `git add .`.
3. Commit with the message:
   ```
   #{id} {concise description of what changed}
   ```

Output the commit hash and message clearly so the next step can use them.
