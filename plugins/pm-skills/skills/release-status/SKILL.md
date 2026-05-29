---
name: release-status
description: Check the release status for a specific tool/board and release number in Azure DevOps (InSites Eco project). Use this skill whenever the user asks about a release, what's in a release, release status, "what PBIs are in release X", "show me release Y for [tool]", "release overview for Mastermind", "what's planned for release 74", "what's still open for release 10", or any variation of wanting to see features and PBIs included in an upcoming or past release. Trigger even if the user only mentions a release number without specifying the tool — ask which tool they mean. Tools covered: Mastermind (NARA), Communities (Square), DMS, Surveys.
---

## Overview
Query Azure DevOps, generate a styled HTML page, save it, and display it in the preview tab.
**Azure DevOps**: org `insites`, project `InSites Eco`

## Tool → Area Path mapping

| User says | Area Path |
|-----------|-----------|
| Mastermind, NARA, Nolvin | `InSites Eco\NARA\Nolvin` |
| Communities, Square, Square Communities | `InSites Eco\Square Communities\Communities` |
| DMS, Data Management | `InSites Eco\Square Communities\Data Management System` |
| Surveys, Instinct Surveys | `InSites Eco\Instinct Surveys\Surveys` |

## Steps

1. **Parse request** — determine tool name and release number. If ambiguous, ask.

2. **Query PBIs** via WIQL:
   ```
   SELECT [System.Id], [System.Title], [System.State], [System.Parent]
   FROM WorkItems
   WHERE [System.TeamProject] = 'InSites Eco'
     AND [System.WorkItemType] = 'Product Backlog Item'
     AND [System.AreaPath] UNDER '{area_path}'
     AND [ScrumInSites.Release] = 'Release {N}'
   ORDER BY [System.Id]
   ```
   > Always include `[System.TeamProject] = 'InSites Eco'` — without it queries return nothing.
   > Work item type is `'Product Backlog Item'` (NOT `'PBI'`).
   > Release field: `ScrumInSites.Release` (NOT `Custom.Release`). Value: `'Release 10'` — word "Release" + number as string.

3. **Fetch parent Features** — batch-fetch unique parent IDs: `System.Id`, `System.Title`, `System.State`.

4. **Fetch Remaining Work** — WIQL for child Tasks:
   ```
   SELECT [System.Id], [System.Parent], [Microsoft.VSTS.Scheduling.RemainingWork]
   FROM WorkItems
   WHERE [System.TeamProject] = 'InSites Eco'
     AND [System.WorkItemType] = 'Task'
     AND [System.Parent] IN ({pbi_ids...})
   ORDER BY [System.Id]
   ```
   Batch-fetch tasks, sum `RemainingWork` per parent PBI.

5. **Generate HTML file** — write to `C:\Users\Alieke\Claude code\release-{N}-{tool-slug}.html` using the template below.

6. **Open in preview tab** — do this every time, without exception:
   - Start server: `preview_start` with name `"release-status"` (uses `C:\Users\Alieke\Claude code\.claude\launch.json`, port 3456)
   - Navigate: `preview_eval` → `window.location.href = 'http://localhost:3456/release-{N}-{tool-slug}.html'`
   - Scroll to top: `preview_eval` → `window.scrollTo(0,0)`

## Data split

- **Open PBIs**: State is NOT Done / Closed / Removed
- **Ready PBIs**: State IS Done / Closed / Removed

## Summary stats (header)

| Stat | Highlight? |
|------|-----------|
| Open PBIs count | ✅ green |
| Remaining work hours (open PBIs only) | ✅ green |
| Ready count | — |
| Total PBIs | — |
| Feature count | — |

## HTML template

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Release {N} · {Tool}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; color: #1e293b; }
  .header { background: #004750; color: white; padding: 28px 40px; }
  .header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
  .header .sub { color: #B6F2A0; font-size: 13px; margin-top: 4px; opacity: 0.8; }
  .stats { display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap; }
  .stat { background: #003840; border-radius: 8px; padding: 12px 18px; min-width: 100px; }
  .stat-val { font-size: 24px; font-weight: 700; color: #f8fafc; line-height: 1; }
  .stat-label { font-size: 11px; color: #B6F2A0; text-transform: uppercase; letter-spacing: 0.6px; margin-top: 4px; opacity: 0.7; }
  .stat.highlight .stat-val { color: #00FF00; }
  .content { max-width: 960px; margin: 0 auto; padding: 32px 24px; }
  .section-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; margin-top: 36px; }
  .section-label:first-child { margin-top: 0; }
  .feature-card { background: white; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
  .feature-header { display: flex; align-items: center; gap: 10px; padding: 11px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
  .feature-id { font-size: 11px; color: #94a3b8; font-weight: 600; font-family: monospace; flex-shrink: 0; }
  .feature-title { font-size: 13px; font-weight: 600; color: #334155; flex: 1; min-width: 0; }
  .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
  .s-done      { background: #dcfce7; color: #15803d; }
  .s-testing   { background: #dbeafe; color: #1d4ed8; }
  .s-pr        { background: #ccfbf1; color: #0f766e; }
  .s-committed { background: #fef3c7; color: #92400e; }
  .s-indev     { background: #ffedd5; color: #c2410c; }
  .s-discovery { background: #ede9fe; color: #6d28d9; }
  .s-draft     { background: #f1f5f9; color: #64748b; }
  .s-devdone   { background: #dcfce7; color: #15803d; }
  table { width: 100%; border-collapse: collapse; }
  tr { border-bottom: 1px solid #f8fafc; }
  tr:last-child { border-bottom: none; }
  tr:hover { background: #f8fafc; }
  td { padding: 9px 16px; font-size: 13px; vertical-align: middle; }
  .col-id { width: 70px; }
  .col-id a { color: #3b82f6; text-decoration: none; font-weight: 700; font-size: 12px; font-family: monospace; }
  .col-id a:hover { text-decoration: underline; }
  .col-rw { width: 60px; text-align: right; font-weight: 700; font-size: 12px; color: #ef4444; white-space: nowrap; }
  .col-rw.none { color: #cbd5e1; font-weight: 400; }
  .col-state { width: 130px; text-align: right; }
</style>
</head>
<body>

<div class="header">
  <h1>Release {N} · {Tool}</h1>
  <div class="sub">InSites Eco &nbsp;·&nbsp; {Area label} &nbsp;·&nbsp; Generated {date}</div>
  <div class="stats">
    <div class="stat highlight"><div class="stat-val">{open_count}</div><div class="stat-label">Open PBIs</div></div>
    <div class="stat highlight"><div class="stat-val">{remaining_h}h</div><div class="stat-label">Remaining</div></div>
    <div class="stat"><div class="stat-val">{done_count}</div><div class="stat-label">Ready</div></div>
    <div class="stat"><div class="stat-val">{total_count}</div><div class="stat-label">Total PBIs</div></div>
    <div class="stat"><div class="stat-val">{feature_count}</div><div class="stat-label">Features</div></div>
  </div>
</div>

<div class="content">

  <div class="section-label">⚠ What's still open — {open_count} PBIs</div>

  <!-- one .feature-card per feature that has open PBIs -->
  <div class="feature-card">
    <div class="feature-header">
      <span class="feature-id">#{feature_id}</span>
      <span class="feature-title">{feature_full_title}</span>
      <span class="badge {feature_state_class}">{feature_state}</span>
    </div>
    <table>
      <tr>
        <td class="col-id"><a href="https://dev.azure.com/insites/InSites%20Eco/_workitems/edit/{pbi_id}">#{pbi_id}</a></td>
        <td>{pbi_short_title}</td>
        <td class="col-rw [none if zero]">{rw}h or —</td>
        <td class="col-state"><span class="badge {state_class}">{pbi_state}</span></td>
      </tr>
    </table>
  </div>

  <div class="section-label" style="margin-top:48px;">✅ What's ready — {done_count} PBIs</div>

  <!-- one .feature-card per feature that has Done PBIs; features with only open PBIs are omitted -->

</div>
</body>
</html>
```

## Badge class mapping

| State | Class |
|-------|-------|
| Done | `s-done` |
| For Testing | `s-testing` |
| PR approved | `s-pr` |
| Committed | `s-committed` |
| In Development | `s-indev` |
| In Discovery | `s-discovery` |
| Draft | `s-draft` |
| Development Done | `s-devdone` |
| Anything else | `s-draft` (fallback) |

## PBI title rule
Show only the last segment after the final `\`. If no `\`, show the full title.

## Remaining Work display
Sum child task `RemainingWork`. Show `{N}h` (class `col-rw`) or `—` (class `col-rw none`) if zero/null.
