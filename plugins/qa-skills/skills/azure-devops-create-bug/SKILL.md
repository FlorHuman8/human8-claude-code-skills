---
name: azure-devops-create-bug
description: Creates Bug work items in Azure DevOps on a chosen team board via user-azure-devops MCP. Filters boards by recent activity, fuzzy-matches board names, prompts for sprint (Current, Next, or Custom). Sets Repro Steps (HTML field), Bucket 1. Functional, Reported By, Severity from priority keywords, Effort 0.25, Origin QA, and prompts for Release and Environment when not in the message. Use for standalone defects on a board. Use azure-devops-create-rework for defects from manual testing tied to a PBI.
---

# Azure DevOps — Create Bug

Create a **Bug** on a selected **team board** (ADO team), with **area** from that team, **iteration** from the user's sprint choice, and category fields per [defaults.md](defaults.md). Repro steps go in **`Microsoft.VSTS.TCM.ReproSteps`** (Html), not `System.Description`. Use MCP server **`user-azure-devops`**. Read [defaults.md](defaults.md) and [field-templates.md](field-templates.md) at the start of every run.

**Not in scope:** parent PBI/story linking, manual-testing source items, rework tasks, or notification comments.

## When to use

- User asks to create, log, or file a **standalone bug** or **defect** on a team board in Azure DevOps or ADO
- User names a **board** (team), **sprint**, **release**, **environment**, or **priority** (e.g. critical, high priority)
- User invokes this skill explicitly

**Use [azure-devops-create-rework](../azure-devops-create-rework/SKILL.md) instead** when the defect comes from **manual testing** and should be a **Rework** task parented under the sprint story/PBI.

## MCP rules

1. **Read the tool schema** from `mcps/user-azure-devops/tools/<tool>.json` before every `CallMcpTool` (`server: "user-azure-devops"`).
2. Never guess picklist values; use allowed values from [defaults.md](defaults.md) and `wit_get_work_item_type`.
3. Do not call `wit_create_work_item` until a **board** is chosen, **sprint choice** is set, **`iterationPath`** is resolved, **Release** and **Environment** are resolved, **`reproStepsHtml`** is built, **`reportedByValue`** is set, repro steps are collected, the title is confirmed (**§6**), required Bug fields are known, and the user confirms the draft (unless they say **create without confirmation** — title confirmation in **§6** still required).
4. Do not rely on `timeframe: "future"` for `work_list_team_iterations` unless the live schema documents it; use §4c fallbacks for Next and Custom.

## Workflow

### 1. Load defaults

Read [defaults.md](defaults.md). Empty `reportedByDisplayName` is expected — **Reported by** is resolved from the current operator each run (§5g).

### 2. Discover boards (teams) and activity

#### 2a. List teams

1. **Projects:** `projectsToScan` from defaults (split on `;`) if set; else `core_list_projects` with `stateFilter: "wellFormed"`.
2. For each project, `core_list_project_teams` with that project name.
3. For each team, record `project`, `team`, `teamId` (if returned), `label` = `{team} ({project})`.

#### 2b. Classify active vs inactive

For each team, using `boardActivityMaxStaleDays` from defaults (default **60**):

1. `work_get_team_settings` with `project` and `team` → `defaultAreaPath` (use longest matching `areaPaths` entry if default is missing).
2. `wit_query_by_wiql` with `project`, `team` (if supported), `top: 1`:

```sql
SELECT [System.Id]
FROM WorkItems
WHERE [System.TeamProject] = '{project}'
  AND [System.AreaPath] UNDER '{areaPath}'
  AND [System.ChangedDate] >= @Today - {boardActivityMaxStaleDays}
```

3. **Active** if ≥1 id returned; else **inactive**. Store `areaPath` on the board record for later §4a.
4. Inactive `label` suffix: ` [no recent activity]`.

Split into `activeBoards` and `inactiveBoards`. For §3 prompts, use **`activeBoards`** only unless:
- `activeBoards` is empty,
- user asks for “all boards”, “show inactive”, or “include inactive”, or
- fuzzy match targets an inactive board (allow with warning).

#### 2c. Extract field hints from message

Parse the user's initial message once; store for §5 and to reduce noise in board/sprint fuzzy matching:

| Hint | Detection (case-insensitive) |
| ---- | ---------------------------- |
| `sprintQuery` | `Sprint N`, `sprint N`, or last path-like sprint token |
| `severityValue` | See §5a |
| `releaseValue` | “release X”, train/release names; match against `releaseAllowedValues` if set |
| `environmentValue` | “production”, “prod”, “uat”, “staging”, “localhost”, “dev”, `test1`, `test 1` → fuzzy-match against `environmentAllowedValues` or Bug schema picklist (e.g. `Test`) — not a defaults alias |

Strip matched release/environment/sprint/priority phrases from `boardQuery` when building board fuzzy input in §3.

### 3. Select board

**Extract board hint** → `boardQuery` (after §2c stripping). Strip filler: `board`, `team`, `create`, `bug`, `defect`, `ado`, `azure devops`, `sprint`, `current`, `next`, `custom`, `release`, `environment`, `critical`, `priority`, `high`. Trim and lowercase. If empty, skip fuzzy matching and go to §3b.

**Candidate list:** `activeBoards` by default; include `inactiveBoards` per §2b rules.

#### 3a. Fuzzy match (when `boardQuery` is non-empty)

Score against `team` (same table as before; use `boardFuzzyMinScore`, default **0.55**).

- Clear best match on **active** list → `selectedBoard`.
- Match only on **inactive** list → `selectedBoard` + warn: no work item activity in the last `{boardActivityMaxStaleDays}` days.
- No match → §3b.

#### 3b. Prompt user

**AskQuestion** or numbered list from the candidate list. If zero active boards, show inactive boards and note none are active recently.

Store `selectedBoard` (`project`, `team`, `areaPath` if known from §2b).

### 4. Resolve area, sprint choice, and iteration

#### 4a. Resolve area

If `selectedBoard.areaPath` missing: `work_get_team_settings` → `defaultAreaPath` → `areaPath`. If missing, stop and ask.

#### 4b. Select sprint target

**Pre-fill from message:**

| Phrase | `sprintChoice` |
| ------ | -------------- |
| `next sprint`, `following sprint` | `Next` |
| `current sprint`, `this sprint` | `Current` |
| `custom sprint`, `sprintQuery` set | `Custom` |

**Prompt** unless set: **AskQuestion** **Current** | **Next** | **Custom**. Apply `sprintChoiceDefault` from defaults when user gave no preference.

#### 4c. Resolve iteration path

Set `iterationPath` and `iterationLabel` (last path segment, or full path).

**Semantics:** **Next** = the **next dated project iteration** after the team's **current** sprint (`work_list_team_iterations`), from flattened `work_list_iterations` — not team-assigned “future” iterations.

**Helpers**

- **Current team sprint:** `work_list_team_iterations` (`timeframe: "current"`). Record `path`, `name`, dates.
- **Project iterations:** `work_list_iterations` (`depth: 2+`), flatten leaves with `path` and dates; sort by `startDate`.

| `sprintChoice` | Resolution |
| -------------- | ---------- |
| **Current** | Current team sprint `path`. |
| **Next** | Current required → first flattened iteration with `startDate` after current `finishDate` (or `startDate` if no finish). Ambiguity within 7 days → shortlist AskQuestion (~5). |
| **Custom** | Picker per defaults counts + `sprintQuery` fuzzy (`sprintFuzzyMinScore`). |

### 5. Resolve bug category fields

Use field refs and values from [defaults.md](defaults.md). Re-verify picklists via `wit_get_work_item_type` if create fails.

#### 5a. Severity (optional unless required)

From initial message and repro (case-insensitive; minor typos OK):

| User intent | Value |
| ----------- | ----- |
| `critical`, `crit`, `blocker` | `severityValueCritical` |
| `high priority`, `high prio`, `high` (not “high environment”) | `severityValueHigh` |

If both match, prefer **Critical**. If neither and field is required, ask. Set `severityField` only when a value is chosen.

#### 5b. Effort (always)

Set `effortField` = `effortValue` (**0.25**).

#### 5c. Origin (always)

Set `originField` = `originValue` (**QA**). No prompt.

#### 5d. Release (required)

Use `releaseValue` from §2c if matched. Else **AskQuestion** or ask: options from `releaseAllowedValues` (split `;`) or Bug type schema. Store exact picklist string.

#### 5e. Environment (required)

Use `environmentValue` from §2c if matched (including fuzzy match for `test1`-like phrases against picklist values). Else prompt like Release using `environmentAllowedValues` or schema.

#### 5f. Bucket (always)

Set `bucketField` = `bucketValue` (**1. Functional**).

#### 5g. Reported by (always)

Set `reportedByField` to the **current operator** — whoever is authenticated to ADO MCP for this run (plain text; sample bugs use values like `Joost`, `Laurens`).

1. `core_get_identity_ids` with `searchFilter` = operator email or display name when known from context (conversation, git user, prior MCP `System.CreatedBy` in the same session).
2. Use `displayName` from the first match.
3. If create fails validation, retry with the **first word** of `displayName` only (first-name pattern).
4. **`reportedByDisplayName` in defaults** — use **only** if explicitly set as a manual override; otherwise skip (empty is normal).
5. If identity lookup fails, ask once: “Reported by (your name)?”

Store as `reportedByValue`.

#### 5h. Repro steps HTML (required)

After repro content is known, build `reproStepsHtml` per [field-templates.md](field-templates.md):

- Numbered steps → `<ol><li>…</li></ol>`
- **Expected** / **Actual** → `<div>Expected: …</div>` and `<div>Actual: …</div>`
- **Video** → `<div>Video: …</div>` (URL, `None`, or link)

**Never** put repro-only content only in `System.Description`.

### 6. Gather content and confirm title

1. **Repro steps** (required) — numbered steps plus expected/actual when provided
2. **Video URL** (optional; use `None` in repro HTML if skipped)

Build or update `reproStepsHtml` (§5h). Re-run §5a on combined message + repro if severity not yet set.

**Title:** derive summary from repro; apply `bugTitlePrefix` if set; confirm **Use this title?** → `confirmedTitle`. **create without confirmation** skips the §8 draft ask only.

### 7. Discover Bug fields

`wit_get_work_item_type` (`Bug`, `selectedBoard.project`). Include any other `alwaysRequired` fields without defaults. Do not set parent links. Omit `System.Description` unless always required.

### 8. Build draft

Show draft:

- Project, **title**, board, area, sprint choice, iteration
- **Severity** (if set), **Effort**, **Release**, **Origin**, **Environment**, **Bucket**, **Reported by**
- **Repro steps** preview (plain-text summary of steps, expected, actual, video)

Ask: **Create this bug?**

### 9. Create

`wit_create_work_item` — include at minimum:

```json
{
  "project": "<selectedBoard.project>",
  "workItemType": "Bug",
  "fields": [
    { "name": "System.Title", "value": "<confirmedTitle>" },
    { "name": "<reproStepsField>", "value": "<reproStepsHtml>", "format": "Html" },
    { "name": "System.AreaPath", "value": "<areaPath>" },
    { "name": "System.IterationPath", "value": "<iterationPath>" },
    { "name": "<effortField>", "value": "<effortValue>" },
    { "name": "<originField>", "value": "<originValue>" },
    { "name": "<releaseField>", "value": "<releaseValue>" },
    { "name": "<environmentField>", "value": "<environmentValue>" },
    { "name": "<bucketField>", "value": "<bucketValue>" },
    { "name": "<reportedByField>", "value": "<reportedByValue>" }
  ]
}
```

Add `severityField` when set. Include other required fields from §7. Merge `defaultTags` if used.

**Do not** parent-link or add mention comments.

### 10. Reply

Return work item URL, board, area, sprint choice, iteration, and category fields used.

## Tool reference

| Step | Tool |
| ---- | ---- |
| List projects | `core_list_projects` |
| List boards (teams) | `core_list_project_teams` |
| Board activity | `work_get_team_settings`, `wit_query_by_wiql` |
| Team area | `work_get_team_settings` |
| Current team iteration | `work_list_team_iterations` |
| Project iterations (Next / Custom) | `work_list_iterations` |
| Reported by identity | `core_get_identity_ids` |
| Bug schema | `wit_get_work_item_type` |
| Create bug | `wit_create_work_item` |

## Errors

- If create fails on picklist values, re-run `wit_get_work_item_type` and update [defaults.md](defaults.md).
- If **Repro Steps** is empty in ADO, confirm `reproStepsField` uses **`format: "Html"`** and matches [field-templates.md](field-templates.md) — not `System.Description`.
- If **Reported by** fails validation, try first name only or ask the user for the exact string used on other bugs.
- No current iteration → ask; **Next** needs current.
- **Next** finds no successor → offer **Custom**.
- Empty **Custom** picker → increase `depth` or check project access.
- Zero **active** boards → show inactive list or narrow `projectsToScan`.
- Environment phrase not in picklist → fuzzy-match against schema values or ask the user.
