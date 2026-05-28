---
name: investigate-bug
description: Investigate a bug: find the root cause and identify which files need to change. Use this when starting work on a Bug work item — explore the codebase with Explore agents, trace the root cause, and present findings with affected files and a proposed fix approach before writing a plan.
---

Investigate a bug: find the root cause and identify which files need to change.

Takes a bug work item ID as `$ARGUMENTS`. Fetch the work item (`mcp__azure-devops__wit_get_work_item`, project: `InSites Eco`, expand: `relations`) for context.

## 1 — Gather context

Ask: "Any context, hints, or constraints before I look? (e.g. where to check, recent related changes)"

Wait and incorporate the response.

## 2 — Investigate

Explore the current repository using Explore agents for broad searches.

Find: root cause, files and functions involved, minimal change needed.

## 3 — Present findings

Show:
- Root cause
- Affected files and key code paths
- Proposed fix approach
- Open questions or assumptions

Ask: "Does this look right? Any corrections?"
