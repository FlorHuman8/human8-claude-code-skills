---
name: open-tasks-overview
description: >
  Generates an HTML overview of open tasks grouped by Feature then PBI for a given Business Requirement (BR) or Feature
  in Azure DevOps (org: insites, project: InSites Eco). Use this skill whenever Lauren asks to see open tasks,
  what's still left on a BR, what's still in development, or asks for a task overview for a sprint or feature.
  Also trigger it for questions like "how many reworks are there?", "what's still open on BR X?",
  "give me an overview of BR X", or any request to see task status grouped by PBI.
  This skill should trigger eagerly - when in doubt, run it.
compatibility:
  tools:
    - azure-devops (MCP)
---

# Open Tasks Overview

Produces a standalone HTML file showing all open tasks grouped by Feature then PBI for a given BR or Feature.
Output is written to `C:\Users\Alieke\Downloads\br-<BR>-open-tasks.html`.

## Key Facts (hardcoded - do not ask the user to confirm)
- **Org**: `insites` | **Project**: `InSites Eco`
- **ADO link base**: `https://dev.azure.com/insites/InSites%20Eco/_workitems/edit/`

---

## Step 1 - Parse input

Extract the BR number or feature prefix from the user's message.
- "32.01" -> BR prefix `32.01`
- "32.01.02" -> Feature prefix `32.01.02`
- "Consultative Canvas" -> search for title containing this string

The WIQL title filter uses `CONTAINS` so partial matches work.

---

## Step 2 - Fetch Features

```wiql
SELECT [System.Id], [System.Title], [System.State], [System.AreaPath]
FROM WorkItems
WHERE [System.TeamProject] = 'InSites Eco'
  AND [System.WorkItemType] = 'Feature'
  AND [System.Title] CONTAINS '<BR_PREFIX>'
  AND [System.State] NOT IN ('Removed')
ORDER BY [System.Title] ASC
```

Replace `<BR_PREFIX>` with the input prefix (e.g. `32.01`).

---

## Step 3 - Fetch PBIs per Feature

For each feature ID, run this WIQL link query to get its child PBIs:

```wiql
SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType]
FROM WorkItemLinks
WHERE (
  [Source].[System.TeamProject] = 'InSites Eco'
  AND [Source].[System.Id] = <FEATURE_ID>
  AND [Source].[System.WorkItemType] = 'Feature'
)
AND (
  [Target].[System.TeamProject] = 'InSites Eco'
  AND [Target].[System.WorkItemType] = 'Product Backlog Item'
  AND [Target].[System.State] NOT IN ('Removed')
)
MODE (MustContain)
```

After getting the PBI IDs, batch-fetch their details with `wit_get_work_items_batch_by_ids` to get
`System.State`, `System.Title`, `System.AreaPath`.

---

## Step 4 - Fetch Tasks per PBI

For each PBI, fetch its open child tasks:

```wiql
SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.IterationPath], [System.Tags]
FROM WorkItemLinks
WHERE (
  [Source].[System.TeamProject] = 'InSites Eco'
  AND [Source].[System.Id] = <PBI_ID>
  AND [Source].[System.WorkItemType] = 'Product Backlog Item'
)
AND (
  [Target].[System.TeamProject] = 'InSites Eco'
  AND [Target].[System.WorkItemType] IN ('Task', 'Bug')
  AND [Target].[System.State] NOT IN ('Done', 'Removed', 'Closed')
)
MODE (MustContain)
```

Batch-fetch task details for all task IDs at once (group across all PBIs for efficiency).

---

## Step 5 - Classify tasks and PBIs

**Routine task** = title (case-insensitive) matches any of:
- starts with or equals "Write test plan"
- starts with or equals "Manual testing" / "Manual Testing"
- starts with or equals "Update regression test plan"
- starts with or equals "4 Eye (QA)"

**Specific task** = everything else (rework, development, bugs, suggestions, etc.)

**PBI classification**:
- **Routine-only PBI**: ALL remaining open tasks are routine -> goes to "Testing pipeline" section
- **Active PBI**: at least one specific task open -> shown in its Feature section with full task table

**Done PBI**: State is "Done" or "Closed" -> collected for the Done section at the bottom.

**Sprint extraction**: Take the last segment of `System.IterationPath` e.g. `InSites Eco\Sprint 264` -> `264`.
If no sprint assigned, show `-`.

**Assignee extraction**: Take only the display name's first word e.g. `Marius Pop` -> `Marius`.
If unassigned, show `-` with class `unassigned`.

---

## Step 6 - Write feature summaries

For each feature that has at least one **active PBI**, write a 2-4 sentence summary focused on
**what still needs to happen**, not who owns what. The goal is to give Lauren a clear picture of
the remaining steps and any blockers before her daily standup.

Good summaries answer:
- What work still needs to be done? (rework fixes, development tasks, reviews)
- What is blocking progress? (unassigned items that need an owner, dependencies between steps)
- What is sequential? (e.g. "rework must land before QA can start")
- What is running in parallel? (e.g. testing already in progress alongside open rework)

Do NOT list assignee names as the main content. Mention an owner only when their absence is the
blocker (i.e. "needs an owner" is the action item, not "X is working on it").

Examples of the right tone:
- "PART 3 needs 4 rework fixes resolved before QA sign-off and regression testing can close it out. Both QA and regression tasks are still unassigned and need an owner."
- "3 PBIs still have open rework before they can close. Workspace PART 2 has 4 rework fixes needed, 3 of which are unassigned and need an owner - testing is already running in parallel."
- "5 development tasks all still To Do, none started yet - these need to be built before the PBI can move to testing."

Do NOT write a summary for features that have no active PBIs (only testing-pipeline or done PBIs).

---

## Step 7 - Write HTML file

Output path: `C:\Users\Alieke\Downloads\br-<BR>-open-tasks.html` where `<BR>` is the BR number with dots replaced by dashes (e.g. `32-01`).

Use the Write tool to write the file directly to that path. Never output markdown - always write a complete standalone HTML file.

### Full CSS (copy verbatim)

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; background: #f5f6f8; color: #1a1a2e; padding: 24px; }
h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
.feature-section { background: #fff; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); margin-bottom: 16px; overflow: hidden; }
.feature-header { padding: 14px 18px; background: #f0f2f7; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #e0e3ec; }
.badge { background: #4a6cf7; color: #fff; border-radius: 20px; padding: 2px 10px; font-size: 12px; font-weight: 600; }
.badge.done { background: #22c55e; }
.badge.pipeline { background: #f59e0b; }
.feature-summary { padding: 12px 18px 10px; border-bottom: 1px solid #eef0f6; font-size: 13px; color: #444; line-height: 1.6; background: #fafbff; }
.feature-summary strong { color: #1a1a2e; }
.pbi-list { padding: 8px 12px; }
details { border-bottom: 1px solid #f0f2f7; }
details:last-child { border-bottom: none; }
summary { padding: 10px 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; list-style: none; user-select: none; }
summary::-webkit-details-marker { display: none; }
summary::before { content: '▶'; font-size: 10px; color: #999; transition: transform 0.15s; flex-shrink: 0; }
details[open] > summary::before { transform: rotate(90deg); }
summary:hover { background: #f8f9fc; border-radius: 6px; }
.pbi-id { color: #4a6cf7; font-weight: 600; text-decoration: none; font-size: 13px; }
.pbi-id:hover { text-decoration: underline; }
.pbi-title { font-weight: 600; color: #1a1a2e; }
.pbi-meta { margin-left: auto; display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
.state-pill { border-radius: 20px; padding: 2px 10px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.state-pill.for-testing    { background: #ede9fe; color: #7c3aed; }
.state-pill.for-review     { background: #dbeafe; color: #1d4ed8; }
.state-pill.in-development { background: #dcfce7; color: #15803d; }
.state-pill.pr-approved    { background: #cffafe; color: #0e7490; }
.state-pill.for-feedback   { background: #fef9c3; color: #a16207; }
.state-pill.additional     { background: #fce7f3; color: #be185d; }
.task-count { font-size: 12px; color: #888; white-space: nowrap; }
.task-table-wrap { padding: 4px 16px 12px 32px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; color: #888; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; padding: 6px 8px; border-bottom: 1px solid #e8eaf0; }
td { padding: 7px 8px; border-bottom: 1px solid #f4f5f9; vertical-align: top; }
tr:last-child td { border-bottom: none; }
td a { color: #4a6cf7; text-decoration: none; font-weight: 600; }
td a:hover { text-decoration: underline; }
td.assignee { color: #555; font-size: 12px; white-space: nowrap; }
td.unassigned { color: #ccc; font-size: 12px; }
.routine td { color: #bbb; }
.routine td a { color: #bbb; }
.routine td.assignee { color: #ccc; }
.footer { margin-top: 12px; color: #888; font-size: 12px; padding: 0 4px; }
```

### HTML layout pattern

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>BR [BR] - [BR_TITLE] - Open Tasks</title>
<style>/* paste CSS above */</style>
</head>
<body>

<h1>BR [BR] - [BR_TITLE]</h1>
<p class="subtitle">[TOTAL_TASKS] open tasks - [ACTIVE_FEATURE_COUNT] features with active work - [DATE]</p>

<!-- Feature section (one per feature with active PBIs) -->
<div class="feature-section">
  <div class="feature-header">[FEATURE_SHORT_TITLE] <span class="badge">[N] tasks</span></div>
  <div class="feature-summary">What still needs to happen - steps and blockers.</div>
  <div class="pbi-list">
    <details>
      <summary>
        <a class="pbi-id" href="https://dev.azure.com/insites/InSites%20Eco/_workitems/edit/[ID]" target="_blank">#[ID]</a>
        <span class="pbi-title">[PBI_TITLE]</span>
        <span class="pbi-meta">
          <span class="state-pill [STATE_CLASS]">[STATE_LABEL]</span>
          <span class="task-count">[N] tasks</span>
        </span>
      </summary>
      <div class="task-table-wrap">
        <table>
          <tr><th>ID</th><th>Title</th><th>State</th><th>Sprint</th><th>Assignee</th></tr>
          <!-- specific tasks first (normal color) -->
          <tr><td><a href="ADO_LINK">#ID</a></td><td>Task title</td><td>State</td><td>264</td><td class="assignee">FirstName</td></tr>
          <!-- routine tasks last (greyed out) -->
          <tr class="routine"><td><a href="ADO_LINK">#ID</a></td><td>Manual testing</td><td>State</td><td>265</td><td class="unassigned">-</td></tr>
        </table>
      </div>
    </details>
  </div>
</div>

<!-- Testing pipeline -->
<div class="feature-section">
  <div class="feature-header">In testing pipeline <span class="badge pipeline">[N] PBIs - [M] tasks</span></div>
  <div class="pbi-list">
    <details>
      <summary>
        <span class="pbi-title">PBIs with only routine tasks remaining (write test plan / manual testing / update regression / 4 Eye QA)</span>
        <span class="pbi-meta"><span class="task-count">click to expand</span></span>
      </summary>
      <div class="task-table-wrap">
        <table>
          <tr><th>PBI</th><th>Title</th><th>Feature</th><th>State</th><th>Tasks</th></tr>
          <!-- one row per routine-only PBI -->
          <tr><td><a href="ADO_LINK">#ID</a></td><td>PBI title</td><td>Feature short name</td><td><span class="state-pill for-testing">For Testing</span></td><td>3</td></tr>
        </table>
      </div>
    </details>
  </div>
</div>

<!-- Done -->
<div class="feature-section">
  <div class="feature-header">Done <span class="badge done">[N] PBIs</span></div>
  <div class="pbi-list">
    <details>
      <summary>
        <span class="pbi-title">Completed PBIs</span>
        <span class="pbi-meta"><span class="task-count">click to expand</span></span>
      </summary>
      <div class="task-table-wrap">
        <table>
          <tr><th>PBI</th><th>Title</th><th>Feature</th></tr>
          <tr><td><a href="ADO_LINK">#ID</a></td><td>PBI title</td><td>Feature short name</td></tr>
        </table>
      </div>
    </details>
  </div>
</div>

<p class="footer">Footer notes about completed features.</p>

</body>
</html>
```

### State pill CSS class mapping

| ADO State | CSS class |
|-----------|-----------|
| For Testing | `for-testing` |
| For Review | `for-review` |
| In Development | `in-development` |
| PR Approved | `pr-approved` |
| For Feedback | `for-feedback` |
| Additional Scope | `additional` |

### Feature short title format

`32.01.02. Consultative Canvas \ User view` -> `32.01.02 - User view`

---

## Tone and style

- Summaries focus on **what still needs to happen** - steps, blockers, dependencies, parallel work
- Bold PBI names and key blockers in summaries
- Only mention a person's name when their absence is the blocker ("unassigned - needs an owner")
- Routine tasks always go at the bottom of each task table, greyed out
- Never ask clarifying questions - just run the queries and render
