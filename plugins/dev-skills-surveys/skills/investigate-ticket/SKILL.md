---
name: investigate-ticket
description: Investigate a Service Desk ticket: find the root cause and determine whether a code fix is needed. Use this when working on a Service Desk task — explore the codebase to find the root cause, then conclude clearly whether a code fix is required or the issue can be resolved through configuration, a data fix, or documentation.
---

Investigate a Service Desk ticket: find the root cause and determine whether a code fix is needed.

Takes a ticket ID as `$ARGUMENTS`. Fetch the work item (`mcp__azure-devops__wit_get_work_item`, project: `InSites Eco`, expand: `relations`).

## 1 — Gather context

Ask: "Any context or hints before I investigate? (e.g. affected customers, environment, recent changes)"

## 2 — Investigate

Explore the codebase to find the root cause. Present findings incrementally — do not propose code changes until the root cause is confirmed with the user.

## 3 — Conclude

Ask: "Does this require a code fix, or can it be resolved another way — configuration, data fix, or documentation?"

Output one of two clear conclusions:

- **Conclusion: no fix needed** — document the findings and resolution for the user. Stop.
- **Conclusion: code fix required** — state the root cause clearly so the next step can use it.
