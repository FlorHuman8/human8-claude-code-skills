---
name: ado-work-item
description: Fetch a work item from Azure DevOps and classify its type. Use this whenever you need to retrieve and categorize an ADO work item before investigation or implementation — it determines whether the item is a Bug, Feature/PBI, Rework task, Service Desk ticket, or standalone task, and is the required first step before routing to any investigation skill.
---

Fetch a work item from Azure DevOps and classify its type.

Takes a work item ID as `$ARGUMENTS` (strip any `#`). If not provided, ask for it.

## Fetch

Call `mcp__azure-devops__wit_get_work_item` (project: `InSites Eco`, expand: `relations`).

If type = Task: also fetch the parent work item (`mcp__azure-devops__wit_get_work_item`) to check its type and state.

## Classify

| Condition | Classification |
|---|---|
| Type = Bug | Bug |
| Type = Product Backlog Item | Feature |
| Type = Task AND parent state = `Needs Rework` | Rework |
| Type = Task AND Activity = `Service Desk` | Ticket |
| Type = Task (none of the above) | Standalone task |

## Output

Display clearly:
- **ID**: the work item ID
- **Title**: work item title
- **Type**: work item type
- **State**: current state
- **Area path**: area path
- **Iteration**: iteration path
- **Classification**: the result from the table above
- **Parent** (if Task): parent ID, title, type, and state
