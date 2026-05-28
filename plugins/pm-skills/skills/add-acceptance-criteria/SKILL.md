---
name: add-acceptance-criteria
description: >
  Use when adding or writing acceptance criteria (ACs) for one or more PBIs in Azure DevOps
  for the InSites Eco project. Trigger whenever the user says "add ACs", "write the criteria",
  "let's do the acceptance criteria", "what should the done criteria be",
  or any variation of wanting to define when a PBI is complete. Also trigger automatically
  after the write-pbi skill completes if the user wants to continue to acceptance criteria —
  even if they just say "now let's add the ACs" or "let's keep going".
  Do not wait for the user to name this skill explicitly.
compatibility:
  tools:
    - azure-devops (MCP)
---

# Add Acceptance Criteria

Adds well-structured acceptance criteria to one or more PBIs in Azure DevOps for the InSites Eco project.

**Key facts (hardcoded — do not ask the user to confirm)**
- Org: `insites` | Project: `InSites Eco`
- AC field: `Microsoft.VSTS.Common.AcceptanceCriteria`

---

## Step 1 — Identify which PBI(s)

If PBI IDs are already known from this conversation (e.g. just created via write-pbi), use them — no need to ask again.

Otherwise, ask the user which PBI(s) to update. They can provide IDs directly or a keyword to search by:

```wiql
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.TeamProject] = 'InSites Eco'
  AND [System.WorkItemType] = 'Product Backlog Item'
  AND [System.Title] CONTAINS '<keyword>'
  AND [System.State] NOT IN ('Done', 'Removed', 'Closed')
ORDER BY [System.ChangedDate] DESC
```

Show matches and ask the user to confirm. Never guess.

---

## Step 2 — Read each PBI

Fetch each PBI with `wit_get_work_item`. You need:
- Title (scope)
- `Custom.UserStory` (who benefits and why)
- `System.Description` (what needs to be built)
- `Microsoft.VSTS.Common.AcceptanceCriteria` (check whether ACs already exist — if so, warn the user before overwriting)

Read all PBIs before drafting anything.

---

## Step 3 — Draft acceptance criteria

Write ACs as **short, direct bullet point statements** — each one independently testable (clear pass or fail). This is the standard format used across the market: readable at a glance, no ceremony.

For conditional behaviours, use an inline "When X, then Y" phrasing within the bullet:
- *When client-dedicated is on, the Tags option is hidden from the session setup flow*

End each PBI's AC list with a ☐ Accessibility guidelines bullet (keep the link if the existing PBI already has one).

**Example:**
```
- Admin can enable or disable the client-dedicated flag when creating or editing an assistant
- When client-dedicated is on, the Tags option is hidden from the session setup flow
- When client-dedicated is on, session details and data source selection appear on a single page (not separate steps)
- Admin can preselect a DMS project; it appears as the locked default in the data source step for session creators
- ☐ Accessibility guidelines
```

### How many criteria to write

Aim for **3–6 per PBI**. Enough to define "done" clearly; not so many that they restate the description.

Cover:
- The primary behaviour(s) described in the PBI
- Key conditional rules or defaults (e.g. "defaults to unpublished", "locked selection")
- Any explicit constraint in the description (permission rules, data limits, access control)

Do not invent requirements. If the description is too sparse to write meaningful ACs, ask the user one focused question before drafting.

---

## Step 4 — Confirm before updating

Show the drafted ACs for all PBIs and ask: "Do these cover the right scenarios? Want to add, change, or remove anything?"

Wait for confirmation. Update and re-confirm if the user requests changes.

---

## Step 5 — Update the PBIs

Use `wit_update_work_item` for each PBI with the field `Microsoft.VSTS.Common.AcceptanceCriteria` set to HTML-formatted content.

**HTML formatting**

All ACs are formatted as a single bullet list. Regular criteria use plain `<li>`, the accessibility item uses the ☐ checkbox character:

```html
<ul>
<li>[criterion]</li>
<li>When [condition], [expected behaviour]</li>
<li>&#9744; <a href="[accessibility link]">Accessibility guidelines</a></li>
</ul>
```

Confirm success for each PBI with its ID and link:
`https://dev.azure.com/insites/InSites%20Eco/_workitems/edit/[ID]`

---

## Tone

Efficient and structured. If the PBI description already makes the scenarios obvious, go straight to the draft — don't ask unnecessary questions.
