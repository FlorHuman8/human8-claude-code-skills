---
name: check-pbi-readiness
description: >
  Check PBI readiness for a Business Release (BR) or Feature in Azure DevOps for the InSites Eco project.
  Use this skill whenever a team lead or PM asks about readiness, refinement readiness, sprint readiness,
  "are the PBIs ready", "which PBIs need work", "readiness check", "is this BR ready", "what's missing on
  the board", or wants to know if PBIs are prepared for refinement or sprint planning. Also trigger when
  someone reviews a BR or Feature for quality or completeness. Only evaluates functional PBIs
  (Bucket = "1. Functional"). Do not wait for the user to say "use the check-pbi-readiness skill" —
  if they're asking about PBI readiness, use this skill.
compatibility:
  tools:
    - azure-devops (MCP)
---

# Check PBI Readiness

Evaluates the **Definition of Ready for Refinement** for all functional PBIs under a Business Release or Feature in InSites Eco.

**Hierarchy**: Business Release → Feature → PBI  
**Scope**: Functional PBIs only (`Custom.Bucket = '1. Functional'`)

## Key Facts (hardcoded — do not ask the user to confirm)

- **Org**: `insites` | **Project**: `InSites Eco`

---

## Step 1 — Identify what to check

Ask the user which **Business Release** or **Feature** they want to check, unless it's already clear from context.

### Looking up a Business Release

```wiql
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.TeamProject] = 'InSites Eco'
  AND [System.WorkItemType] = 'Business Release'
  AND [System.Title] CONTAINS '<keyword from user>'
  AND [System.State] NOT IN ('Done', 'Removed', 'Closed')
ORDER BY [System.Title] ASC
```

### Looking up a Feature

```wiql
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.TeamProject] = 'InSites Eco'
  AND [System.WorkItemType] = 'Feature'
  AND [System.Title] CONTAINS '<keyword from user>'
  AND [System.State] NOT IN ('Done', 'Removed', 'Closed')
ORDER BY [System.Title] ASC
```

- Multiple matches → show the list and ask the user to pick.
- No match → ask the user for the correct name or ID.
- Single match → confirm before proceeding.

---

## Step 2 — Fetch all functional PBIs

### If checking a Business Release

First, get all Features under the BR:

```wiql
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.TeamProject] = 'InSites Eco'
  AND [System.WorkItemType] = 'Feature'
  AND [System.Parent] = <BR_ID>
  AND [System.State] NOT IN ('Done', 'Removed', 'Closed')
ORDER BY [System.Title] ASC
```

Then fetch all functional PBIs under those Features. For ≤10 features, use a single query with an IN clause:

```wiql
SELECT [System.Id], [System.Title], [System.Parent]
FROM WorkItems
WHERE [System.TeamProject] = 'InSites Eco'
  AND [System.WorkItemType] = 'Product Backlog Item'
  AND [System.Parent] IN (<feature_id_1>, <feature_id_2>, ...)
  AND [Custom.Bucket] = '1. Functional'
  AND [System.State] NOT IN ('Done', 'Removed', 'Closed')
ORDER BY [System.Parent] ASC, [System.Title] ASC
```

For larger feature sets, query per Feature and combine the results.

### If checking a Feature

```wiql
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.TeamProject] = 'InSites Eco'
  AND [System.WorkItemType] = 'Product Backlog Item'
  AND [System.Parent] = <Feature_ID>
  AND [Custom.Bucket] = '1. Functional'
  AND [System.State] NOT IN ('Done', 'Removed', 'Closed')
ORDER BY [System.Title] ASC
```

If no functional PBIs are found, say so and offer to check a different BR/Feature or widen the state filter.

---

## Step 3 — Retrieve full field data

Fetch every PBI using `wit_get_work_items_batch_by_ids` with `expand: fields, relations`. You need the full field set to run the readiness check.

### Known field names

| Criterion | Field key |
|-----------|----------|
| User Story | `Custom.UserStory` |
| Description | `System.Description` |
| Acceptance Criteria | `Microsoft.VSTS.Common.AcceptanceCriteria` |
| Bucket | `Custom.Bucket` |
| PM | `Custom.ProductOwner` |
| Value area | `Microsoft.VSTS.Common.ValueArea` |
| State | `System.State` |
| Area | `System.AreaPath` |

### Fields to discover at runtime

Three fields have names you need to verify from the actual API response: **Design**, **Feature toggle**, and **Translations**. When you fetch the first PBI, inspect all field keys in the response. Look for keys containing "design", "toggle", "translat" (case-insensitive). Use those keys for all subsequent PBIs in this session.

Likely names: `Custom.Design`, `Custom.FeatureToggle`, `Custom.Translations` — but verify before relying on them.

If a field can't be found at all, mark that criterion as `—` (unknown) rather than failing.

---

## Step 4 — Evaluate each PBI against the readiness checklist

### Definition of Ready for Refinement

| # | Criterion | Passes if… |
|---|-----------|------------|
| 1 | **Area** | `System.AreaPath` is set and is not just `InSites Eco` (root) |
| 2 | **User Story** | `Custom.UserStory` is non-empty |
| 3 | **Description** | `System.Description` is non-empty |
| 4 | **Design** | Design field is non-empty (Lo-Fi or Hi-Fi link/image present) |
| 5 | **Acceptance Criteria** | `Microsoft.VSTS.Common.AcceptanceCriteria` is non-empty |
| 6 | **Bucket** | `Custom.Bucket` is set |
| 7 | **PM** | `Custom.ProductOwner` is set |
| 8 | **Business Release** | Feature parent exists AND that Feature has a Business Release parent (check `relations` for `System.LinkTypes.Hierarchy-Reverse` chain) |
| 9 | **Feature** | PBI has a `System.Parent` pointing to a Feature work item |
| 10 | **Feature toggle** | Field is non-empty or contains 'n/a' — show `—` if field not found on this PBI |
| 11 | **Translations** | Field is non-empty or contains 'n/a' — show `—` if field not found on this PBI |
| 12 | **Value area** | `Microsoft.VSTS.Common.ValueArea` = `Business` |
| 13 | **State** | `System.State` is non-empty and not `New` |

### Readiness classification

Count failing criteria (ignore `—` N/A items when scoring):

| Label | Failing count |
|-------|--------------|
| ✅ **Ready** | 0 |
| ⚠️ **Almost ready** | 1–2 |
| ❌ **Not ready** | 3 or more |

---

## Step 5 — Present the report

### Business Release → grouped by Feature

```
## PBI Readiness — [BR title]
Checked: [date] | Functional PBIs only | [N] PBIs across [M] features

### [Feature title](https://dev.azure.com/insites/InSites%20Eco/_workitems/edit/[ID])

| PBI | Title | State | Ready | Missing |
|-----|-------|-------|-------|---------|
| [#148188](link) | Send both original & ENG transcripts — DMS | New | ⚠️ | Design, State |
| [#148180](link) | Add clips to Summary | New | ⚠️ | State |
| [#147250](link) | Create and Save Video Clips | In Development | ✅ | — |

### [Next Feature title](link)
...

---
**Total: [X] ✅ ready · [Y] ⚠️ almost · [Z] ❌ not ready out of [N] functional PBIs**
```

### Single Feature → flat list

```
## PBI Readiness — [Feature title]
Checked: [date] | Functional PBIs only | [N] PBIs

| PBI | Title | State | Ready | Missing |
|-----|-------|-------|-------|---------|
| [#ID](link) | PBI title | New | ⚠️ | Design, State |
| [#ID](link) | PBI title | Approved | ✅ | — |

**Total: [X] ✅ ready · [Y] ⚠️ almost · [Z] ❌ not ready**
```

### Column guide

- **PBI**: work item ID as a clickable link → `[#ID](https://dev.azure.com/insites/InSites%20Eco/_workitems/edit/[ID])`
- **Title**: PBI title — omit the feature number prefix to keep the table readable
- **State**: the actual Azure DevOps state (New, Approved, In Development, Committed, Additional Scope, etc.)
- **Ready**: readiness indicator based on missing count — ✅ (0 missing) · ⚠️ (1–2 missing) · ❌ (3+ missing)
- **Missing**: comma-separated list of failing criteria, or `—` if none

Sort within each feature section: ❌ first, then ⚠️, then ✅.

### Detailed checklist (on request)

After the summary, offer: *"Want the full checklist for any of the ❌ or ⚠️ PBIs?"*

If requested — or if the total is 5 or fewer PBIs — show the per-PBI breakdown:

```
### [PBI title](link)

| Criterion | Status |
|-----------|--------|
| Area | ✅ |
| User Story | ❌ empty |
| Description | ✅ |
| Design | ❌ empty |
| Acceptance Criteria | ✅ |
| Bucket | ✅ |
| PM | ✅ |
| Business Release | ✅ |
| Feature | ✅ |
| Feature toggle | — (N/A) |
| Translations | — (N/A) |
| Value area | ❌ not set to Business |
| State | ❌ New (must not be blank or New) |
```

---

## Tone

Be efficient and direct. Team leads use this to quickly find what's blocking sprint planning — the report should be scannable. Don't explain readiness theory unless asked, just show the gaps.
