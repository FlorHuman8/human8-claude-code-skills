---
name: write-pbi
description: >
  Use when creating a new PBI (Product Backlog Item) in Azure DevOps for the InSites Eco project.
  Trigger whenever the user wants to capture a new feature, improvement, or requirement — even if
  they say "add a ticket", "create a story", "I need a PBI for...", "write up a backlog item", or
  simply describe something new they want built. Also trigger when the user shares a list of changes
  or requirements that may need multiple PBIs. Ask clarifying questions only if the input is too
  vague, then create the PBI(s) directly in Azure DevOps. Do not wait for the user to say "use the
  write-pbi skill" — if they're describing work that needs to be tracked, use this skill.
compatibility:
  tools:
    - azure-devops (MCP)
---

# Write PBI

Creates one or more well-structured Product Backlog Items in Azure DevOps for the InSites Eco project.

**Hierarchy**: Business Release → Feature → PBI

**Numbering scheme**:
- Business Release: `XX.XX` (e.g. `32.02`)
- Feature: `XX.XX.XX` (e.g. `32.02.01`)
- PBI: same `XX.XX.XX` prefix as the Feature — no extra sequence number appended. Multiple PBIs under the same feature all share the same number; they are distinguished only by their description text.

If the target Feature does not exist yet, offers to create it first before proceeding.

## Key Facts (hardcoded — do not ask the user to confirm)

- **Org**: `insites` | **Project**: `InSites Eco`
- **User**: Lauren Vetter | **Email**: `LaurenV@wearehuman8.com`

---

## Step 1 — Gather information

Always collect the following before drafting anything:

| Field | Notes |
|-------|-------|
| What (feature/change) | Always needed |
| Who benefits (role/persona) | Infer if obvious |
| Why (business value) | Ask if not apparent |
| **Business Release** | Always ask — see below |
| **Area path** | Always ask — see below |
| **Feature** | Always ask — see below |
| **PM** | Always ask — see below |
| **Bucket** | Always ask — see below |
| Iteration | Do not assign — leave empty |

### Business Release

Ask the user which **Business Release** this work belongs to. This places the work on the Human8 NOW-NEXT Roadmap and is the parent of the Feature.

Look it up by name:

```wiql
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.TeamProject] = 'InSites Eco'
  AND [System.WorkItemType] = 'Business Release'
  AND [System.Title] CONTAINS '<keyword from user>'
  AND [System.State] NOT IN ('Done', 'Removed', 'Closed')
ORDER BY [System.Title] ASC
```

- **One match**: confirm with the user before proceeding.
- **Multiple matches**: show the list and ask the user to pick.
- **No match**: do not guess — ask the user to provide the correct name or ID.

Record the Business Release **ID**, **number** (e.g. `32.01`), and **title** (e.g. `32.01. Consultative Canvas`).

### Area path options

Ask the user which team this work belongs to:

| Team | Area path |
|------|-----------|
| Instinct Surveys | `InSites Eco\Instinct Surveys\Surveys` |
| NARA | `InSites Eco\NARA` |
| NARA – Nolvin | `InSites Eco\NARA\Nolvin` |
| Square Communities | `InSites Eco\Square Communities\Communities` |
| Square Communities – Data Management | `InSites Eco\Square Communities\Data Management System` |
| Platform Engineering | `InSites Eco\Platform Engineering` |

Present as a numbered list. When creating multiple PBIs, the area path applies to all unless the user specifies otherwise.

### Feature

Ask the user which **Feature** the PBI(s) belong to and look it up:

```wiql
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.TeamProject] = 'InSites Eco'
  AND [System.WorkItemType] = 'Feature'
  AND [System.Title] CONTAINS '<keyword>'
  AND [System.State] NOT IN ('Done', 'Removed', 'Closed')
ORDER BY [System.ChangedDate] DESC
```

- **Found**: if multiple results, show them and ask the user to confirm. Record the feature's **ID** and **full title** (e.g. `32.01.06. Consultative Canvas \ Minimal changes`).
  - **Validate the number**: the feature title must start with a 3-segment number (`XX.XX.XX.`). If it only has a 2-segment number (e.g. `32.02. …`), it was created incorrectly — tell the user and ask whether to fix the title before proceeding.
- **Not found**: tell the user and ask if they'd like to create it first. If yes, follow the Feature Creation flow below, then return to Step 2.

**After confirming an existing Feature**, verify it is linked to the Business Release as parent. Retrieve it using `wit_get_work_item` with `expand: relations` and check for a `System.LinkTypes.Hierarchy-Reverse` relation pointing to the Business Release ID. If this link is **missing**, establish it immediately using `wit_work_items_link`:
```
{ id: <feature_id>, linkToId: <business_release_id>, type: "parent" }
```
Do this silently — no need to surface it to the user unless it fails.

When creating multiple PBIs, the same feature applies to all unless the user specifies otherwise.

### PM

Ask who the **PM** is for these PBIs. This is stored in the `Custom.ProductOwner` field as a first name (e.g. `Lauren`, `Alieke`). When creating multiple PBIs, the same PM applies to all unless the user specifies otherwise.

### Bucket

Ask which **bucket** these PBIs belong to. Present the options as a numbered list:

1. `1. Functional`
2. `2.1. Client (sponsored)`
3. `2.2. Client (non-sponsored)`
4. `3.1. Non-functional (incremental & recurring)`
5. `3.2. Non-functional (strategic)`
6. `4. Support & production bugs`
7. `5. Other`

This is stored in the `Custom.Bucket` field. When creating multiple PBIs, the same bucket applies to all unless the user specifies otherwise.

### PBI splitting

If the user's input describes multiple distinct pieces of work, prefer **fewer, larger PBIs** over many small ones. A good PBI is a meaningful, sprint-sized deliverable. Only split when pieces are truly independent — different product areas, user roles, or clearly separable deliverables. Multiple bullet points alone is not a reason to split. Tell the user your proposed split upfront and let them adjust before drafting.

---

## Feature Creation (only if feature doesn't exist yet)

The Business Release is already known from Step 1 — no additional parent lookup needed.

### 1. Find the next feature number

Query existing features under this Business Release to determine the next sequence number:

```wiql
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.TeamProject] = 'InSites Eco'
  AND [System.WorkItemType] = 'Feature'
  AND [System.Title] CONTAINS '<Business Release number>'
  AND [System.State] NOT IN ('Done', 'Removed', 'Closed')
ORDER BY [System.Title] ASC
```

Extract the sequence numbers (the third segment, e.g. `06` from `32.01.06`). Take the highest and increment by 1. If no features exist yet, start at `01`.

Example: Business Release `32.01. Consultative Canvas`, existing features `32.01.01` and `32.01.05` → new feature gets `32.01.06`.

### 2. Draft the Feature title

```
{BR number}.{sequence number padded to 2 digits}. {BR title without number} \ {feature-specific name}
```

Example: `32.01.06. Consultative Canvas \ Client Experience`

Ask the user for the **feature-specific name** (the part after `\`). Show the full constructed title for confirmation before creating.

### 3. Create the Feature

Use `wit_create_work_item`:
- `project`: `InSites Eco`
- `type`: `Feature`
- `title`: constructed feature title
- `area_path`: same as selected for the PBI(s)
- `parent`: Business Release ID (Feature is a child of the Business Release)
- Do **not** set an iteration path

After creation, **always** use `wit_work_items_link` to explicitly establish the hierarchy link:
```
{ id: <new_feature_id>, linkToId: <business_release_id>, type: "parent" }
```
This ensures the Feature appears on the roadmap under the Business Release.

Confirm success and share the new Feature ID and link:
`https://dev.azure.com/insites/InSites%20Eco/_workitems/edit/[ID]`

Record the new Feature's **ID** and **full title**, then continue to Step 2.

---

## Step 2 — Draft all PBIs

Draft all PBIs before asking for confirmation so the user can review everything at once.

### Title

```
{feature number (3 segments)}. {BR title} \ {feature name} \ {specific PBI description}
```

Example: `32.01.06. Consultative Canvas \ Minimal changes \ Replace supporting evidence panel`

All PBIs under the same feature share the **same number prefix**. The description at the end is the only differentiator. It should be short and start with a verb.

### User story

```
As a [type of user],
I want [to do something / for something to happen],
so that [I get this value/outcome].
```

### Description

A detailed requirements breakdown — not a summary. Write as plain content with no heading or label:

- Start with one sentence stating what needs to be built or changed.
- Follow with bulleted requirements, one per major functional area or behaviour.
  - Sub-bullets for specific details, edge cases, or constraints.
  - **Bold** key feature names, actions, or UI elements.
  - Specific enough that a developer can act without follow-up questions.

If the user's input doesn't contain enough detail, ask targeted questions. Don't invent requirements.

---

## Step 3 — Confirm before creating

Show all drafted PBIs clearly and ask: "Does this look right? Shall I create these in Azure DevOps?"

Wait for confirmation. Update and re-confirm if the user requests changes.

---

## Step 4 — Create the PBIs

Create each work item using `wit_create_work_item`:
- `project`: `InSites Eco`
- `type`: `Product Backlog Item`
- `title`: constructed title
- `Custom.UserStory`: HTML-formatted user story — in the dedicated User Story field, not the description
- `description`: HTML-formatted requirements content only — no heading, no user story. Bullets as `<ul><li>`, bold as `<strong>`
- `Custom.ProductOwner`: PM first name as provided (e.g. `Lauren`)
- `Custom.Bucket`: bucket value as selected (e.g. `1. Functional`)
- `area_path`: selected in Step 1
- `parent`: Feature ID (PBI is a child of the Feature)
- Do **not** set an iteration path

After creating all PBIs, use a single `wit_work_items_link` batch call to explicitly establish the parent link for every PBI:
```
[
  { id: <pbi_1_id>, linkToId: <feature_id>, type: "parent" },
  { id: <pbi_2_id>, linkToId: <feature_id>, type: "parent" },
  ...
]
```
This ensures all PBIs are properly linked to the Feature and visible on the roadmap. This call is idempotent — safe to run even if the link was already set during creation.

**Confirm success** — for each PBI, share its ID and a clickable link:
`https://dev.azure.com/insites/InSites%20Eco/_workitems/edit/[ID]`

Then immediately continue to Step 5 — do not wait for the user to ask.

---

## Step 5 — Add acceptance criteria

After all PBIs are created and confirmed, say: "PBIs are in. Let's add acceptance criteria."

Then proceed directly using the **add-acceptance-criteria** skill. The PBI IDs are already known from this session — no need to look them up again.

---

## Tone

Be efficient. Structure the user's intent well — don't over-formalize. If the description is already detailed enough, skip unnecessary questions and go straight to the draft.
