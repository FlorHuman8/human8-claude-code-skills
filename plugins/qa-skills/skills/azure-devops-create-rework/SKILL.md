---
name: azure-devops-create-rework
description: Creates Rework tasks in Azure DevOps from Manual testing work items via user-azure-devops MCP. Eligible source tasks are To Do or In Progress and changed within the last ~6 months. Rework titles use a repro-based suffix after the "Rework - " prefix with mandatory user confirmation. Sets task type to Rework, parents under the sprint story/PBI, on the team's current sprint, sets the parent PBI/story state to Needs rework (or parentReworkState from defaults), adds repro steps and optional video URL to the description, and posts a comment @-mentioning the parent PBI assignee and assignees from earlier rework tasks on that PBI. Use when the user asks to create or log a rework, files a defect from manual testing, or provides an ADO URL or work item ID while testing.
---

# Azure DevOps — Create Rework

Create a **Task** with type **Rework**, parented under the **Manual testing task’s parent** (User Story / PBI), on the **current sprint** iteration, and set the parent’s state to **Needs rework** (or `parentReworkState` from defaults). Use MCP server `**user-azure-devops`**. Read [defaults.md](defaults.md) and [field-templates.md](field-templates.md) at the start of every run.

## When to use

- User asks to create, log, or file a **rework** in Azure DevOps or ADO
- User is doing **manual testing** and found an issue that needs a rework task
- User provides an ADO work item **URL** or **ID** for the item under test

## MCP rules

1. **Read the tool schema** from `mcps/user-azure-devops/tools/<tool>.json` before every `CallMcpTool` (`server: "user-azure-devops"`).
2. Never guess picklist values; use allowed values from `wit_get_work_item_type`.
3. Do not call `wit_create_work_item` until repro steps are collected, the title is confirmed (§4.1), required fields are set, and the user confirms the draft (unless they say **create without confirmation** — title confirmation in §4.1 still required).
4. Prefer `wit_create_work_item` over `wit_add_child_work_items` so the **Rework** type field can be set.

## Workflow

### 1. Load defaults

Read [defaults.md](defaults.md).

### 2. Resolve source work item

**If the user gave a URL or ID:**

- Parse ID from `dev.azure.com/{org}/{project}/_workitems/edit/{id}` or a bare numeric ID.
- Call `wit_get_work_item` with `expand: "relations"` (and `project` from URL or defaults).

**If no URL/ID:**

1. Build project list: `projectsToScan` from defaults (split on `;`) if set; else `core_list_projects` with `stateFilter: "wellFormed"`.
2. For each project, call `wit_query_by_wiql` with WIQL. Substitute:
  - `@project` → project name
  - `'Manual testing'` → `manualTestingTitleContains` from defaults
  - `IN ('To Do', 'In Progress')` → build from `manualTestingStates` (split on `;`, quote each state)
  - `@Today - 180` → `@Today - {manualTestingMaxStaleDays}`

```sql
SELECT [System.Id], [System.Title], [System.State], [System.ChangedDate], [System.IterationPath]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.WorkItemType] = 'Task'
  AND [System.Title] CONTAINS 'Manual testing'
  AND [System.AssignedTo] = @Me
  AND [System.State] IN ('To Do', 'In Progress')
  AND [System.ChangedDate] >= @Today - 180
ORDER BY [System.ChangedDate] DESC
```

1. Merge results (max ~30).
2. **Resolve parent title for each candidate** (before asking the user to pick):
  - For each manual testing task id, call `wit_get_work_item` with `expand: "relations"` (or read `System.Parent` if present).
  - Find parent via `System.LinkTypes.Hierarchy-Reverse`; call `wit_get_work_item` for the parent id and read `System.Title`.
  - Store as `parentTitle` for that candidate. If there is no parent, use `(no parent)` as the label suffix.
3. Use **AskQuestion** when available. Show the **parent PBI title**, not the manual testing task title (which is usually just “Manual testing”):
  `{id} — {parentTitle} [{state}, changed {changedDate}] ({project})`
   Example: `149912 — Add 'Login type' & 'follows square wechat account' status per participant to health export [In Progress, changed 2026-05-28] (InSites Eco)`
4. If none found, ask for URL/ID or suggest: `projectsToScan` too narrow, no tasks in **To Do** / **In Progress**, nothing changed in the last ~6 months, or wrong state names in `manualTestingStates`.

**Validate source** (after `wit_get_work_item` for URL/ID or post-selection):

Track whether the user supplied an explicit URL/ID (`explicitSource: true`).

1. **Title** — must contain `manualTestingTitleContains` (default: `Manual testing`). If not, warn and ask whether to continue.
2. **State** — `System.State` must be one of `manualTestingStates` (split on `;`). If not:
  - **Explicit URL/ID:** show current state, explain eligible states, ask **Continue anyway?** — proceed only on explicit yes.
  - **From discovery:** should not happen if WIQL is correct; treat as error, re-query or ask for another ID.
3. **Recency** — `System.ChangedDate` must be on or after today minus `manualTestingMaxStaleDays` (compare the field value to the cutoff date). If stale:
  - **Explicit URL/ID:** show changed date and cutoff, ask **Continue anyway?** — proceed only on explicit yes.
  - **From discovery:** treat as error, re-query or ask for another ID.

### 3. Resolve parent (story / PBI), team, and current sprint

From the source item’s relations, find the parent: `rel` = `System.LinkTypes.Hierarchy-Reverse` → `url` or id in relation.

- Call `wit_get_work_item` for the parent id (include `System.AssignedTo`, `System.WorkItemType`, and `System.State` in fields).
- Record `System.AreaPath`, `System.IterationPath`, `System.TeamProject`, title, and parent assignee — for area, sprint resolution, draft display, linking, and notification (**not** for rework title or description).
- Store `parentWorkItemType` ← `System.WorkItemType`, `parentState` ← `System.State` (for draft preview and §8.1).
- **List earlier rework tasks** on this parent (for notification and draft preview). `wit_query_by_wiql` with `project` = parent’s `System.TeamProject`:

```sql
SELECT [System.Id], [System.Title], [System.AssignedTo]
FROM WorkItemLinks
WHERE (
  [Source].[System.Id] = {parentId}
  AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
)
AND [Target].[System.WorkItemType] = 'Task'
AND [Target].[Microsoft.VSTS.Common.Activity] = 'Rework'
ORDER BY [System.CreatedDate] DESC
```

Substitute `{parentId}` and use `reworkTypeValue` from defaults for the Activity filter if the process template differs. Store as `earlierReworks` (id, title, assignedTo). After create, exclude the new rework id from this list.

**Fields for the new rework:**


| Field                  | Resolution                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `System.AreaPath`      | Parent’s area path (unchanged)                                                                                      |
| `System.IterationPath` | **Current sprint** for the team derived from the parent (see below) — **never** the parent’s `System.IterationPath` |


The parent may sit on an older sprint (e.g. Sprint 262) while the team’s current sprint is newer (e.g. Sprint 264). Only the sprint changes; area and team context come from the parent.

#### Resolve team from parent (always)

Use the parent’s `System.AreaPath` (e.g. `InSites Eco\Square Communities\Communities`).

1. `core_list_project_teams` with the parent’s `System.TeamProject`.
2. For each team, `work_get_team_settings` (`project`, `team`).
3. Pick the team whose `defaultAreaPath` or `areaPaths` **includes** the parent area: parent path equals the default area, or starts with it when `includeChildren` is true. Prefer the **longest / most specific** match.

If no team matches, stop and report the parent area path. Do not fall back to defaults, the manual testing task, or the parent’s iteration.

#### Resolve current sprint

`work_list_team_iterations` with:

- `project` = parent’s `System.TeamProject`
- `team` = team resolved above
- `timeframe` = `"current"`

Use the returned iteration `path` (e.g. `InSites Eco\Sprint 264`) as `System.IterationPath`.

If the call returns no current iteration, stop and ask the user. Do not use the parent’s or manual testing task’s iteration.

#### Draft note

When parent iteration ≠ rework iteration, show in the draft (informational only):

*Parent PBI is on {parentIteration}; rework will be on {reworkIteration} (current sprint for team {team}).*

### 4. Gather content (required)

Ask unless already provided in the conversation:

1. **Repro steps** (required)
2. **Video URL** (optional; use `None` in description if skipped)

Do not ask for or default a title here.

### 4.1 Suggest and confirm title

After repro steps are available, derive a suggested title. Do **not** proceed to §5 until the user confirms.

**Derive suggested title:**

1. Start with `reworkTitlePrefix` from defaults (`Rework -`); ensure exactly one space before the suffix (`Rework - {summary}`).
2. Append a **short defect summary** from repro:
  - Prefer the core problem (one phrase), not numbered steps or stack traces.
  - Use the first meaningful line or sentence; strip leading step markers (`1.`, `Given`, `When`, `Then`).
  - Title-case lightly if repro is all lowercase; preserve product terms.
3. **Never use** parent title, manual testing task title, or story name.
4. Truncate so total length stays within ADO limits (~255 chars); keep the prefix intact.


| Repro (excerpt)                                          | Suggested title                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| Export missing Login type column for WeChat participants | `Rework - Export missing Login type column for WeChat participants` |
| Vague repro                                              | `Rework -` + best-effort phrase; note uncertainty when asking       |


**Confirm (mandatory):**

- Show: **Suggested title:** `{full title}`
- Ask: **Use this title?** (Accept / Edit)
- If **Edit**: user supplies new text; prepend `reworkTitlePrefix` if missing.
- Store the result as `confirmedTitle` for §7–8.
- If user already provided repro + a title in one message, still show the repro-derived suggestion once, then confirm (do not skip).
- **create without confirmation** skips the final draft ask (§7) but **not** this title step.

### 5. Discover Task fields and Rework type

Call `wit_get_work_item_type` with `workItemType: "Task"` and `project` from parent.

- **Task type field**: Set `taskTypeField` from defaults (`Microsoft.VSTS.Common.Activity` = Activity). If empty or create fails, find the field whose allowed values include `reworkTypeValue` (`Rework`) and update defaults.
- Treat fields with `alwaysRequired: true` as mandatory unless they have a `defaultValue`.

### 6. Build description

Apply [field-templates.md](field-templates.md) with repro and video URL only.

### 7. Draft and confirm

Show:

- Project, **title** = `confirmedTitle` (from §4.1 only — never parent-derived)
- Manual testing: `#{sourceId}` — {sourceTitle}
- Parent: `#{parentId}` — {parentTitle}
- Team: {resolvedTeam}
- Area: {parentAreaPath}
- Iteration: {reworkIteration} (current sprint; parent is on {parentIteration} if different)
- **Parent state:** if `parentReworkState` from defaults is empty, show “(skipped — not configured)”. If `parentState` equals `parentReworkState`, show “unchanged — already {parentReworkState}”. Otherwise show `{parentState}` → `{parentReworkState}`.
- Task type field = `Rework`
- Description preview (Repro steps + Recording only)
- **Notification comment** (preview): who will be mentioned (display names) — parent assignee + earlier rework assignees, deduped; skip if none

If the user wants a different title, return to §4.1 before creating.

Ask: **Create this rework task?** Proceed only on explicit yes (or **create without confirmation**).

### 8. Create and link

Call `wit_create_work_item`:

```json
{
  "project": "<parent TeamProject>",
  "workItemType": "Task",
  "fields": [
    { "name": "System.Title", "value": "<confirmedTitle>" },
    { "name": "System.Description", "value": "...", "format": "Markdown" },
    { "name": "System.AreaPath", "value": "<parent area>" },
    { "name": "System.IterationPath", "value": "<current sprint path from parent team>" },
    { "name": "<taskTypeField>", "value": "Rework" }
  ]
}
```

Include every required field from step 5. Merge `defaultTags` into `System.Tags` if used.

Call `wit_work_items_link`:

```json
{
  "project": "<parent TeamProject>",
  "updates": [{ "id": <newTaskId>, "linkToId": <parentId>, "type": "parent" }]
}
```

### 8.1 Set parent state

After §8 succeeds, set the parent PBI/story to `parentReworkState` from defaults (default: `Needs rework`). No extra user confirmation.

1. If `parentReworkState` is empty, **skip** this step.
2. If `parentState` (from §3) already equals `parentReworkState`, **skip** the update. Record `parentStateResult` = `already` for §10.
3. Validate the target state:
  - Call `wit_get_work_item_type` with `project` = parent’s `System.TeamProject` and `workItemType` = `parentWorkItemType`.
  - Confirm `parentReworkState` is an allowed value for `System.State` on that type.
  - If not found, **skip** the update, list allowed states from the schema, set `parentStateResult` = `invalid`, and continue to §9 — do not guess alternate spellings.
4. Call `wit_update_work_item`:

```json
{
  "id": "<parentId>",
  "updates": [
    {
      "op": "replace",
      "path": "/fields/System.State",
      "value": "<parentReworkState>"
    }
  ]
}
```

1. On success, set `parentStateResult` = `updated`. On failure (e.g. invalid workflow transition), set `parentStateResult` = `failed`, surface the ADO error text, and continue to §9 — do not roll back the rework task.

### 9. Add notification comment

On the **new rework** (`workItemId` = new task id), notify the parent assignee and assignees from earlier rework tasks on the same PBI.

1. **Build mention set** (dedupe by `System.AssignedTo.id`):
  - Parent PBI `System.AssignedTo` (if set).
  - Each `earlierReworks` entry with an assignee (exclude the new rework id).
2. If the set is empty, **skip** this step.
3. Build comment text per [field-templates.md](field-templates.md) (notification section): **mentions only** — a `<div>` of `<a href="#" data-vss-mention="version:2.0,{id}">@{displayName}</a>` per person. Use each person’s `System.AssignedTo.id` and `displayName`. Do **not** use plain `@Name` Markdown; that does not send email.
4. `wit_add_work_item_comment`:

```json
{
  "project": "<parent TeamProject>",
  "workItemId": <newTaskId>,
  "comment": "<div><a href=\"#\" data-vss-mention=\"version:2.0,{guid}\">@Name</a> …</div>",
  "format": "Html"
}
```

If the comment fails, report the error but still return the new rework URL (the work item was created).

### 10. Reply

1. Parse new work item **ID** from the create response.
2. Return URL: replace `{id}` in `workItemUrlPattern` from defaults (adjust project segment if a different project was used).
3. Note who was mentioned in the notification comment (if any).
4. Report parent state outcome from §8.1:
  - `updated` — parent moved to `{parentReworkState}` (include parent URL using `workItemUrlPattern` with `{parentId}`).
  - `already` — parent was already `{parentReworkState}`.
  - `skipped` — `parentReworkState` not configured.
  - `invalid` — target state not in parent type schema (allowed states were listed).
  - `failed` — update attempted but ADO rejected (include error).

## Tool reference


| Step                 | Tool                        |
| -------------------- | --------------------------- |
| List projects        | `core_list_projects`        |
| Manual testing tasks | `wit_query_by_wiql`         |
| Load item / parent   | `wit_get_work_item`         |
| List teams           | `core_list_project_teams`   |
| Team area paths      | `work_get_team_settings`    |
| Task schema          | `wit_get_work_item_type`    |
| Current iteration    | `work_list_team_iterations` |
| Earlier reworks      | `wit_query_by_wiql`         |
| Create task          | `wit_create_work_item`      |
| Link to parent       | `wit_work_items_link`       |
| Parent type schema   | `wit_get_work_item_type`    |
| Set parent state     | `wit_update_work_item`      |
| Resolve identity id  | `core_get_identity_ids`     |
| Notify assignees     | `wit_add_work_item_comment` |


## Errors

- If create fails on the type field, re-run `wit_get_work_item_type` and update `taskTypeField` in defaults.
- If parent link fails, confirm parent id and project; parent must allow Task children.
- If no team matches the parent area path, list candidate teams or ask the user — never use the parent’s iteration as a fallback.
- If `work_list_team_iterations` returns no current iteration, ask the user — never use the parent’s or manual testing task’s iteration.
- If MCP prompts for project, pass the parent’s `System.TeamProject`. Pass `team` from the resolved team (§3), not from defaults.
- If WIQL fails on the `IN` clause or returns no rows unexpectedly, verify `manualTestingStates` matches exact Task state names in that project (case-sensitive).
- If the earlier-rework WIQL fails, fall back: `wit_get_work_item` on the parent with `expand: "relations"`, load each `Hierarchy-Forward` child, keep tasks where Activity = `Rework`.
- If `wit_add_work_item_comment` fails, surface the error; do not roll back the work item.
- If mentions do not notify (plain text only in UI), confirm `format` is `Html` and `data-vss-mention` uses `version:2.0,{System.AssignedTo.id}`; resolve missing ids via `core_get_identity_ids`.
- If parent state update fails (invalid transition), report the error; still return the new rework URL.
- If `parentReworkState` is not in the parent type’s allowed `System.State` values, list allowed values from `wit_get_work_item_type`; do not guess alternate spellings.

