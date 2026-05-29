# InSites Azure DevOps — rework defaults

Edit this file once to reduce prompts. Leave a value empty (`""`) to discover or ask each time.

| Key | Value |
|-----|-------|
| organization | insites |
| project | InSites Eco |
| workItemType | Task |
| workItemUrlPattern | https://dev.azure.com/insites/InSites%20Eco/_workitems/edit/{id} |
| areaPath | |
| projectsToScan | |
| taskTypeField | Microsoft.VSTS.Common.Activity |
| manualTestingTitleContains | Manual testing |
| manualTestingStates | To Do;In Progress |
| manualTestingMaxStaleDays | 180 |
| reworkTypeValue | Rework |
| reworkTitlePrefix | Rework - |
| parentReworkState | Needs rework |
| defaultTags | |

## Notes

- **project**: Default when creating; Manual testing discovery still scans all projects unless `projectsToScan` is set.
- **projectsToScan**: Semicolon-separated project names to limit WIQL (e.g. `InSites Eco;Other Project`). Empty = all well-formed projects from `core_list_projects`.
- **Team / sprint**: Not configured here. Team is inferred from the parent PBI’s `System.AreaPath` via `core_list_project_teams` + `work_get_team_settings`. Current sprint comes from `work_list_team_iterations` for that team.
- **taskTypeField**: `Microsoft.VSTS.Common.Activity` (Activity picklist; value `Rework`). Re-verify via `wit_get_work_item_type` if create fails.
- **manualTestingTitleContains**: Substring matched against `[System.Title]` in WIQL and when validating the source item.
- **manualTestingStates**: Semicolon-separated `System.State` values for discovery WIQL (`IN (...)`) and source validation. Must match the process template exactly (case-sensitive).
- **manualTestingMaxStaleDays**: Maximum age in days for `System.ChangedDate` (~6 months = 180). Used as `@Today - N` in WIQL. Adjust to 183 if you prefer a closer calendar-month approximation.
- **reworkTitlePrefix**: Required start of every rework `System.Title` (`Rework -` plus one space before the suffix → `Rework - …`). Prepend if the user supplies a title without it.
- **parentReworkState**: `System.State` applied to the parent PBI/story after the rework task is created and linked (e.g. `Needs rework`). Must match the parent work item type’s allowed states exactly (case-sensitive). Empty = skip the parent state update.
