---
name: investigate-task
description: Investigate a standalone task from a PBI: understand the specific deliverable and plan the approach. Use this when working on a Task that is a child of a PBI (but not a Rework or Service Desk task) — read the task description and parent PBI context, explore the codebase, and present the approach before writing a plan.
---

Investigate a standalone task from a PBI: understand the specific deliverable and plan the approach.

Takes a task ID as `$ARGUMENTS`. Fetch the task and its parent PBI (`mcp__azure-devops__wit_get_work_item`, project: `InSites Eco`, expand: `relations`).

## 1 — Gather context

Ask: "Any context, hints, or constraints before I start?"

## 2 — Investigate

Read the task description to understand the specific deliverable. Read the parent PBI (acceptance criteria, linked tasks) for broader context. Explore the codebase for relevant files and patterns.

## 3 — Present findings

Show:
- What this task requires
- How it fits within the parent PBI
- Proposed approach and files involved

Ask: "Does this look right? Any corrections?"
