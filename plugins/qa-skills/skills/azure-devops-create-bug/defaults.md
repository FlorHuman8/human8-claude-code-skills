# InSites Azure DevOps — bug defaults

Edit this file once to reduce prompts. Leave a value empty (`""`) to discover or ask each time.

| Key | Value |
|-----|-------|
| organization | insites |
| project | InSites Eco |
| workItemType | Bug |
| workItemUrlPattern | https://dev.azure.com/insites/InSites%20Eco/_workitems/edit/{id} |
| projectsToScan | |
| bugTitlePrefix | |
| defaultTags | |
| boardFuzzyMinScore | 0.55 |
| boardActivityMaxStaleDays | 60 |
| sprintChoiceDefault | |
| customSprintPastCount | 3 |
| customSprintFutureCount | 6 |
| sprintFuzzyMinScore | 0.55 |
| severityField | Microsoft.VSTS.Common.Severity |
| severityValueCritical | 1 - Critical |
| severityValueHigh | 2 - High |
| effortField | Microsoft.VSTS.Scheduling.Effort |
| effortValue | 0.25 |
| releaseField | ScrumInSites.Release |
| releaseAllowedValues | |
| originField | Custom.BugCategory_Origin |
| originValue | QA |
| environmentField | Custom.BugCategory_Environment |
| environmentAllowedValues | |
| reproStepsField | Microsoft.VSTS.TCM.ReproSteps |
| bucketField | Custom.Bucket |
| bucketValue | 1. Functional |
| reportedByField | ScrumInSites.BugReportedBy |
| reportedByDisplayName | |

## Notes

- **project**: Default project when listing boards; board discovery still scans all projects unless `projectsToScan` is set.
- **projectsToScan**: Semicolon-separated project names (e.g. `InSites Eco;Other Project`). Empty = all well-formed projects from `core_list_projects`. Use to limit WIQL activity checks when many projects exist.
- **board**: An Azure DevOps **team** (each team has a board). Listed via `core_list_project_teams` per project.
- **boardActivityMaxStaleDays**: Boards with no work items under the team area changed in this many days are **inactive** (`60` ≈ 2 months). Inactive boards are hidden by default; user can request “show all boards” / “include inactive”.
- **bugTitlePrefix**: Optional prefix for `System.Title` (e.g. `Bug -`). Prepend on confirm if the user's title omits it. Empty = use the confirmed title as-is.
- **boardFuzzyMinScore**: Minimum similarity (0–1) to accept a fuzzy board match without showing the full list.
- **sprintChoiceDefault**: If `current`, `next`, or `custom`, skip the sprint AskQuestion when the user gave no sprint preference and did not dispute.
- **customSprintPastCount** / **customSprintFutureCount**: For **Custom** sprint, how many past and future project iterations to include in the picker, plus always include the team's current sprint.
- **sprintFuzzyMinScore**: Minimum similarity for fuzzy Custom sprint match (e.g. `Sprint 264`).
- **Next sprint**: The **next dated project iteration** after the team's **current** sprint (from `work_list_team_iterations`), chosen from flattened `work_list_iterations` — not team-assigned “future” iterations (MCP has no `timeframe: future`).
- **Custom sprint list**: Uses **project** iterations via `work_list_iterations`. Flatten the tree, sort by `attributes.startDate`, apply the past/future window.
- **severityField**: `Microsoft.VSTS.Common.Severity` with `severityValueCritical` / `severityValueHigh` picklist strings (verify against your project if create fails).
- **effortField** / **effortValue**: Effort is always `0.25` on create.
- **releaseField**: Always prompt or parse Release from the user message unless `releaseAllowedValues` is set for AskQuestion.
- **originField** / **originValue**: Origin is always `QA` on create.
- **environmentField**: Always prompt or parse Environment from the user message. Match against `environmentAllowedValues` or schema picklist (fuzzy match for phrases like `test1`) — no default environment alias in this file.
- **reproStepsField**: Repro content goes here as **Html** — not `System.Description` (the Repro Steps tab reads this field).
- **bucketField** / **bucketValue**: Bucket is always `1. Functional` on create.
- **reportedByField** / **reportedByDisplayName**: Plain-text name on `ScrumInSites.BugReportedBy` (sample bugs use first names like `Joost`, `Laurens`). Leave `reportedByDisplayName` empty — always resolve from the **authenticated ADO user running this skill** each run (see SKILL §5g). Set `reportedByDisplayName` only as a manual override for a shared team defaults file.
