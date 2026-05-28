---
name: investigate-feature
description: Investigate a Feature (PBI): understand the acceptance criteria and find the right place to implement it. Use this when starting work on a Product Backlog Item — read the acceptance criteria, explore the codebase for existing patterns and reusable components, and present the proposed approach before writing a plan.
---

Investigate a Feature (PBI): understand the acceptance criteria and find the right place to implement it.

Takes a PBI ID as `$ARGUMENTS`. Fetch the work item (`mcp__azure-devops__wit_get_work_item`, project: `InSites Eco`, expand: `relations`).

## 1 — Gather context

Ask: "Any context, constraints, or hints before I start exploring?"

## 2 — Investigate

Read the acceptance criteria. Explore the codebase for:
- Existing patterns and components to extend
- Files most likely to need changes
- Utilities or abstractions already in place to reuse

Use Explore agents for broad searches.

## 3 — Present findings

Show:
- What needs to be built
- Proposed approach and files involved
- Existing code to reuse
- Open questions or assumptions

Ask: "Does this look right? Any corrections?"
