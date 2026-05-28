---
name: create-bug-from-ticket
description: Create a Bug work item from a Service Desk ticket investigation, including child tasks and ADO links. Use this when a ticket investigation concludes that a code fix is needed — it creates the Bug work item, an Investigate task (marked Done), and a Manual Testing task, then links the original ticket to the new bug.
---

Create a Bug work item from a Service Desk ticket investigation, including child tasks and ADO links.

Takes a ticket ID as `$ARGUMENTS`. Investigation findings must be fresh in the current conversation context.

## 1 — Create the Bug

`mcp__azure-devops__wit_create_work_item` (project: `InSites Eco`, type: `Bug`):
- **Title**: concise description of the defect (from root cause)
- **Description** (html): root cause summary and affected area
- **Area path**: same as the original ticket
- **Iteration path**: current sprint via `mcp__azure-devops__work_list_team_iterations` (project: `InSites Eco`, team: `instinct surveys`)

## 2 — Create child tasks

Create both tasks below in their respective `wit_create_work_item` calls. Include the parent relation **in the initial create call**, not after.

**Parent linking — use this exact format for both tasks:**
- Relation type: `System.LinkTypes.Hierarchy-Reverse`
- URL: `https://dev.azure.com/insites/_apis/wit/workItems/{bugId}`

After each creation, verify the parent link by fetching the new task and confirming the relation exists. If missing, add it via `mcp__azure-devops__wit_work_items_link`.

**Investigate task** (work already done — create in Done state):
- Title: `Investigate`, Type: Task, State: `Done`, Assigned To: current user
- Description: root cause, affected files, key code paths, assumptions

**Manual Testing task:**
Ask: "Who should I assign Manual Testing to? (display name or email)"
Ask: "Who should I mention in the comment?"

- Title: `Manual Testing`, Type: Task
- Assigned To: user's answer, Activity: `Testing`
- Description: verification steps from the investigation
- After creation, add @mention comment (html) asking them to review the test steps

## 3 — Link and continue

Link ticket to Bug: `mcp__azure-devops__wit_work_items_link`, relation `System.LinkTypes.Related`.

Output the new bug ID clearly so tackle can continue with `investigate-bug`.
