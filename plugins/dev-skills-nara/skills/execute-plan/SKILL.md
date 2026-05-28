---
name: execute-plan
description: Implement the plan for a work item step by step. Use this after branches are set up to read the plan file and execute every implementation step in order, then verify the result with the user before proceeding to commit.
---

Implement the plan for a work item step by step.

Takes a work item ID as `$ARGUMENTS`. Read the plan file at `.ai/plans/{id}-*.md`.

Note which repos and worktrees are involved — all file edits must target the correct worktree, not the original working directory.

## Execute

Work through the implementation steps in order. Mark each step complete as you go. Do not make changes beyond what the plan specifies.

## Verify

Describe how to manually verify the change (test steps, repro scenario, expected outcome). Ask the user to confirm it works.

If issues are found, fix them before continuing.

Output clearly that verification is complete so the next step can proceed.
