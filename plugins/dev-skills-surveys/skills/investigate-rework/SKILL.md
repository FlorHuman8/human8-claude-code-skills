---
name: investigate-rework
description: Investigate a Rework task: understand what needs to be corrected from the previous implementation. Use this when a work item's parent PBI is in Needs Rework state — read the reviewer's feedback, find the prior implementation in git history, and identify exactly what needs to change (scope to the rework feedback only).
---

Investigate a Rework task: understand what needs to be corrected from the previous implementation.

Takes a task ID as `$ARGUMENTS`. Fetch the task and its parent PBI (`mcp__azure-devops__wit_get_work_item`, project: `InSites Eco`, expand: `relations`).

## 1 — Read the rework scope

Read the Task description and any comments carefully — the reviewer will have explained what needs reworking. Scope to the rework feedback only; do not re-plan the entire PBI.

## 2 — Check prior work

Run `git log` to find commits or branches for the parent PBI. Read the relevant changes to understand what was done and what specifically needs to change.

## 3 — Present findings

Show:
- What the rework feedback requires
- Which files need to change and why
- Proposed approach

Ask: "Does this look right? Any corrections?"
