---
name: ado-wrap
description: Create or update the Manual Testing task and move the work item to For Review. Use this at the end of a work item workflow — after the PR is created — to create (or update) the Manual Testing child task with verification steps, assign it, and transition the parent work item state to For Review.
---

Create or update the Manual Testing task and move the work item to For Review.

Takes a work item ID as `$ARGUMENTS`.

## 1 — Determine the target

The target is the top-level PBI or Bug:
- If the work item is a PBI or Bug: it is the target.
- If it is a Task: fetch its parent (`mcp__azure-devops__wit_get_work_item`) — that is the target.

## 2 — Manual Testing task

> **Skip this step** if the work item came from `/create-bug-from-ticket` — the Manual Testing task was already created there.

Search the target's child tasks for an open task with "Manual Testing" or "Manual Test" in the title.

**Found (open task):** update with `mcp__azure-devops__wit_update_work_item`:
- Read the existing description first; append the verification steps (do not overwrite).
- Ask: "Who should I assign this to?" — update Assigned To.
- Ask: "Who should I mention in the comment?" — add an @mention comment (html).

**Not found (or all Done):** create a new Task via `mcp__azure-devops__wit_create_work_item`:
- Title: `Manual Testing`
- Area path and iteration path: copied from the target work item
- Ask: "Who should I assign Manual Testing to?"
- Ask: "Who should I mention in the comment?"
- Description: verification steps from the plan

**Parent linking — do this in the create call, not after:**
Include the relation in the initial `wit_create_work_item` call using:
- Relation type: `System.LinkTypes.Hierarchy-Reverse`
- URL: `https://dev.azure.com/insites/_apis/wit/workItems/{targetId}`

After creation, verify the parent link by fetching the new task and confirming the relation exists. If it is missing, add it explicitly via `mcp__azure-devops__wit_work_items_link`.

Then add the @mention comment (html).

## 3 — Update state

Set the target work item state to `For Review` using `mcp__azure-devops__wit_update_work_item`.

Output the updated work item state and PR URL(s) from context.
