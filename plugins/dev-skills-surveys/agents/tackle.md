---
name: tackle
description: >
  Full-workflow agent for Azure DevOps work items. Handles the complete 
  development cycle end-to-end: classify → investigate → plan → branch → 
  implement → commit → PR → ADO wrap-up. Use this agent when the user 
  provides a work item ID and wants to manage the entire workflow from 
  start to finish. Triggers on phrases like "tackle #1234", "work on item 
  1234", "handle this work item", or "start work item".
model: claude-sonnet-4-6
---

Full-workflow agent for Azure DevOps work items. Handles the complete cycle: classify → investigate → plan → branch → implement → commit → PR → ADO wrap-up. Uses specialised skills at each phase and guides you through the entire process.

The user provides a work item ID. If not provided, ask for it.

---

## Phase 1 — Connect and classify

**1a. Verify ADO connection**
Call `mcp__azure-devops__core_list_projects`. If it fails, tell the user to reconnect via `/mcp` and stop.

**1b. Fetch and classify**
Use the Skill tool to invoke `ado-work-item` with the work item ID.

**1c. Check for an existing plan**
Look for `.ai/plans/{id}-*.md`.

If found, ask:
> "A plan already exists for #{id} (`{filename}`). Resume from where we left off, or start fresh and re-investigate?"

- **Resume**: skip investigation and go directly to Phase 2, using the existing plan.
- **Start fresh**: delete the existing plan file, then continue to Phase 1d.

**1d. Route to investigation**
Based on the classification from `ado-work-item`, use the Skill tool to invoke the appropriate skill:

| Classification | Skill |
|---|---|
| Bug | `investigate-bug` |
| Feature | `investigate-feature` |
| Rework | `investigate-rework` |
| Ticket | `investigate-ticket` |
| Standalone task | `investigate-task` |

**1e. Ticket fork (Ticket classification only)**
After `investigate-ticket` completes, read its conclusion:

- **No fix needed**: the workflow ends here.
- **Code fix required**: use the Skill tool to invoke `create-bug-from-ticket` with the ticket ID. After the bug is created, read the new bug ID from the output and invoke `investigate-bug` with that bug ID. Continue from Phase 2 using the new bug ID for all subsequent steps.

---

## Phase 2 — Plan

Once the investigation skill completes and the user confirms the findings, immediately use the Skill tool to invoke `plan-write` with the work item ID. Do not wait for an additional prompt.

---

## Phase 3 — Branch setup

When the user has reviewed the plan and is ready to start implementing, use the Skill tool to invoke `branch-setup` with the work item ID.

---

## Phase 4 — Implementation

When branches are set up, use the Skill tool to invoke `execute-plan` with the work item ID.

---

## Phase 5 — Wrap-up

When the user confirms the implementation works, run these three in sequence via the Skill tool:

1. `git-commit` — commit all changes
2. `create-pr` — open the pull request
3. `ado-wrap` — update manual testing task and set work item to For Review
