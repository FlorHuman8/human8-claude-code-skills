---
name: write-user-guide
description: Draft a Bookstack user guide page from an Azure DevOps Feature and its PBIs, for the InSites Eco / Mastermind platform. Use this skill whenever the user wants to document a feature for end-users, write a guide page, turn a Feature into user-facing documentation, or says things like "write a guide for X", "document this feature", "create the user guide page for", "add this to the user guide", "write up how to use X for clients", "let's write the documentation for". Pull the Feature from Azure DevOps and draft a structured page ready to paste into Bookstack.
---

# Write User Guide

Drafts a Bookstack user guide page for end-users (researchers / clients) based on an Azure DevOps Feature and its PBIs. The output is a page draft ready to paste into Bookstack.

## What you'll produce

A page draft ready to paste into Bookstack. The structure is yours to decide — let the content shape it. The goal is a page that genuinely helps a user understand and use the feature, not one that follows a fixed template.

---

## Step 1: Identify the Feature in Azure DevOps

Ask the user which Feature to document. Search for it using the Azure DevOps MCP:

```wiql
SELECT [System.Id], [System.Title], [System.Description], [System.AreaPath]
FROM WorkItems
WHERE [System.WorkItemType] = 'Feature'
AND [System.TeamProject] = 'InSites Eco'
AND [System.Title] CONTAINS '<keyword from user>'
ORDER BY [System.ChangedDate] DESC
```

Then pull all child PBIs under that Feature:

```wiql
SELECT [System.Id], [System.Title], [System.Description], [Custom.UserStory]
FROM WorkItems
WHERE [System.WorkItemType] = 'Product Backlog Item'
AND [System.Parent] = <feature-id>
ORDER BY [System.Title] ASC
```

If multiple Features match, show the list and ask the user to confirm which one. Never guess.

---

## Step 2: Ask for the Bookstack destination

Ask: **"Which Bookstack book and chapter should this page go in?"**

Example answer: *Getting Started with Mastermind > Assistants*

You'll include this in a breadcrumb note at the top of the draft so it's clear where to paste the page.

---

## Step 3: Draft the page

Use the Feature description and PBI content (user stories, descriptions, acceptance criteria) to write the guide. The ADO content describes what was *built* — your job is to translate that into *how a user experiences it*.

### Deriving the page title

Strip the ADO sequence numbering and use only the human-readable part, in Title Case:
- ADO title: `32.01.06. Consultative Canvas \ Minimal changes \ Replace supporting evidence panel`
- Page title: `Replace Supporting Evidence Panel`

### Deciding the structure

Read the Feature and PBIs first, then decide what sections will best serve the user. Ask yourself: what does someone need to know to understand and use this feature successfully? Let the answer shape the page.

Some features need a concept explanation before you can describe how to use them. Some have multiple distinct modes or phases that each deserve their own section. Some are simple enough that a short intro and a step list is all that's needed. There is no mandatory template — use good judgment.

**Useful section types to draw from (use what fits, skip what doesn't):**
- Navigation — where to find the feature in the product
- Overview / concept — what it is and what problem it solves
- Step-by-step usage — numbered walkthrough of the actual user workflow
- Sub-feature or option explanations — when individual elements need more context
- Tips, notes, or important caveats — especially for AI-generated content, beta features, or non-obvious behaviour

### Writing style

- **Second person throughout**: "You can find...", "When you open...", "Click on..."
- **Bold every UI label** the user needs to find or interact with: **Assistants**, **Start Chat**, **Flow tab**
- Keep sentences short and action-oriented
- Numbered steps should follow the real user workflow in sequence — think through the actual clicks
- Mine PBI descriptions and acceptance criteria for interaction details; they often describe exactly what the user sees or does
- Lead with the user benefit, not the technical implementation

### Screenshot placeholders

Write each as a blockquote so it stands out visually and is easy to find when adding screenshots later:

> [Screenshot: brief description, e.g. "Left sidebar with Assistants highlighted, Concept Optimization Assistant card visible"]

### When information is missing

PBI content describes the build, not the user experience. Translate as needed:
- *"Add a Flow tab showing the Innovation Canvas steps"* → *"The **Flow tab** gives you an overview of all the steps we'll go through together"*
- If the navigation path isn't clear from ADO, make a reasonable inference and flag it: *(Navigation assumed — please verify before publishing)*
- If PBIs are sparse, work from the Feature description alone and note the gaps

---

## Step 4: Present the draft and confirm

Show the full draft and ask:
- "Does this look right? Anything to adjust?"
- Call out any sections where you made assumptions or where you're unsure about the navigation path or UI labels

Apply any edits, then present the final version cleanly formatted so it's easy to select and paste into Bookstack.
