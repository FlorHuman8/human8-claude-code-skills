---
name: create-pr
description: Create a pull request for a work item. Use this after committing all changes to open a PR from the feature/bugfix branch to beta, with the correct title format, description (what changed and why), and work item links.
---

Create a pull request for a work item.

Takes a work item ID as `$ARGUMENTS`. Read `.ai/plans/{id}-*.md` for context.

## 1 — Determine work items to link

- If the work item is a Bug or PBI: link it directly.
- If the work item is a Task: fetch the parent (`mcp__azure-devops__wit_get_work_item`) to get the PBI or Bug ID. Link both — every PR must be associated with a top-level PBI or Bug.

## 2 — Create the PR

`mcp__azure-devops__repo_create_pull_request`: source branch → `beta`

- **Title**:
  - PBI or Bug: `#{id} {description}`
  - Task: `#{parent_id} #{id} {description}`
- **Description**:
  - **What changed**: bullet list of files and logic modified
  - **Why**: root cause or requirement being addressed
- **Work item refs**: include the work item ID and parent ID (if Task)

Output the PR URL clearly so the next step can use it.
