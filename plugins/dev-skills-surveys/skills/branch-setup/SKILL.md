---
name: branch-setup
description: Set up the git branch and optional worktree for a work item. Use this before starting implementation — after the plan is approved — to create the correct feature/bugfix/rework branch and optionally set up an isolated worktree for parallel development.
---

Set up the git branch and optional worktree for a work item.

Takes a work item ID as `$ARGUMENTS`. Read `.ai/plans/{id}-*.md` for the category and slug. If no plan exists, ask directly.

## 1 — Derive branch name

| Category | Branch name |
|---|---|
| Bug | `bugfix/{id}-{slug}` |
| Feature / Standalone task | `feature/{id}-{slug}` |
| Rework | Ask: reuse the existing parent PBI branch, or create `rework/{id}-{slug}`? |

## 2 — Choose workspace setup

Ask:
> "How do you want to set up the workspace?
> 1. New branch + isolated worktree (recommended for parallel work)
> 2. New branch in the current directory
> 3. Continue on the current branch as-is"

**Option 1 — Worktree:** run for each affected repo:
```
git worktree add ../{repo-name}-{branch-name} -b {branch-name} origin/beta
```

**Option 2 — New branch:** run for each affected repo:
```
git fetch origin
git checkout -b {branch-name} origin/beta
git push -u origin {branch-name}
```

**Option 3:** skip — continue on the current branch as-is.

Output the branch name and worktree path(s) clearly so the next step can use them.
