---
name: review-pr
description: Use when reviewing a pull request. Triggers on "review PR", "review this PR", "/review", or any request to review a pull request or give code review feedback.
---

# Review PR

## Overview
Reviews a PR by inspecting the diff against a set of generic quality checks, then presents findings in chat for confirmation before posting comments and voting on the PR and all related PRs.

## Steps

### 1. Identify the PR
If a PR ID was given as an argument, use it. Otherwise, get the current branch with `git branch --show-current` and call `mcp__azure-devops__repo_list_pull_requests_by_repo_or_project` filtering by `sourceRefName` to find the open PR.

If no open PR is found, tell the user and stop.

### 2. Fetch PR data and review history in parallel
In a single round, call all of these simultaneously:
- `mcp__azure-devops__repo_get_pull_request_by_id` with `includeWorkItemRefs: true` — to get title, description, source/target branch, and linked work item IDs
- `mcp__azure-devops__repo_get_pull_request_changes` with `includeDiffs: true` and `includeLineContent: true` — to get the full line-by-line diff
- `mcp__azure-devops__repo_list_pull_request_threads` — to find unresolved threads from prior review rounds

Note any `Active` threads from previous rounds. List them in the chat summary under **Open from previous round**. Do not re-post these as new comments, but do verify whether the current diff addresses them.

### 3. Fetch all work items in parallel
Using all work item IDs from `workItemRefs`, call `mcp__azure-devops__wit_get_work_item` for each one simultaneously (with `expand: all`). These are needed to verify whether the code covers the work item.

If no work items are linked, note this as ⚠️ Uncertain for the PBI completeness check and continue.

### 3.5. Classify files by priority (PRs with > 15 changed files only)
If the diff touches more than 15 files, classify them before evaluating:

| Priority | File types |
|---|---|
| High | Shared API contracts, controllers, DTOs, services with external callers |
| Medium | Business logic, stores, repositories, tests |
| Low | Config files, migrations, static assets, generated code |

Apply full scrutiny to High files. For Low files, check only secrets and breaking changes.

### 4. Check every quality item

**Confidence scoring:** For every item evaluated, assign a confidence score (0–100) based on how conclusively the diff supports your finding. **Only surface findings with confidence ≥ 80** in the chat summary and PR comments. Log lower-confidence observations silently but do not report them.

Evaluate all items below by inspecting the diff directly. For each one, record: ✅ Pass, ❌ Fail, or ⚠️ Uncertain. For every failure, note the file path and the **modified file** line number (from `modifiedLineNumberStart` in the diff) so the comment can be anchored precisely in step 6.

| Item | What to check in the diff |
|---|---|
| Accurate PR description | Does the summary meaningfully describe what changed and why — not just boilerplate or a restatement of the ticket title? |
| No sensitive information | Passwords, secrets, API keys, tokens, or connection strings anywhere in the diff? |
| Unused code removed | Commented-out blocks, unreachable code, unused variables or imports? |
| No hardcoded values | Magic strings or numbers in logic code that should be named constants? |
| Tests added or updated | Were test files added or modified alongside the changed production code? |
| Logic is sound | Does the new or changed logic make sense end-to-end? Are there edge cases, race conditions, or incorrect assumptions? |
| Security concerns addressed | SQL injection, XSS, auth bypass, insecure deserialization, exposed endpoints — anything suspicious? |
| Fits design and architecture | Does the implementation approach match existing patterns in the codebase? No unexpected abstractions or framework misuse? |
| Code covers the work item | Cross-check the work item description against the diff — is everything described in the ticket actually implemented? |
| No client-facing breaking changes | Removed or renamed endpoints, changed DTO fields or types, new required request fields, removed enum values — anything that would silently break existing callers? |

### 5. Present findings in chat

Before posting anything, display the full review in chat using this format:

```
## PR Review: [PR title] (#[ID])

### Open from previous round (if any)
- [Thread summary] — still unresolved / resolved by this diff

### What this PR does
[2–3 sentences describing what the code actually changes and why, based on the diff and work item — not a restatement of the PR description.]

### Logic assessment
[2–4 sentences evaluating whether the approach and logic flow make sense. Call out edge cases, incorrect assumptions, or subtle bugs even if they don't map to a checklist item.]

### ✅ Passed ([n] items)
- [item name]

### ❌ Failed ([n] items)
**[Item name]** — `[file]:[line]` (confidence: [score])
[2–4 sentences: what was found, why it fails, and a concrete suggestion for how to fix it.]

### ⚠️ Uncertain ([n] items)
**[Item name]** (confidence: [score])
[What you could not verify and why. What the author should double-check.]

---
[If there are failures or uncertainties]: Ready to post the above as PR comments? Reply "Post" to proceed, or "Cancel" to stop.
[If everything passed]: Ready to approve the PR? Reply "Approve" to approve, or "Cancel" to stop.
```

**Rules:**
- "What this PR does" and "Logic assessment" are always required, even if everything passes.
- Every failed or uncertain item must include a confidence score and a concrete suggestion.
- Include the file and line reference next to each failure header.
- Do not truncate — show the full detail that will also appear in PR comments.
- Only report findings with confidence ≥ 80.

Wait for the user to reply before proceeding.
- **"Post"** → continue to step 6
- **"Approve"** → continue to step 7
- **"Cancel"** → stop, do not touch Azure DevOps
- Any other reply → treat as feedback, incorporate it, re-display the updated summary, and prompt again

### 6. Post comments and set PRs to "Wait for author"

For each ❌ Fail or ⚠️ Uncertain item, post a thread comment using `mcp__azure-devops__repo_create_pull_request_thread`.

**Comment format:**
```
**[Item name]**

[1–2 sentences explaining what was found and why it fails. Reference the specific file/method if applicable.]
```

**Always anchor comments to the exact location in the diff:**
- Set `filePath` to the file where the problem was found.
- Set `rightFileStartLine` and `rightFileEndLine` to the line numbers in the **modified** file. Use `modifiedLineNumberStart` from the diff blocks.
- If the problem spans a single line, set both to the same line number with `rightFileStartOffset` and `rightFileEndOffset` set to 1.
- Only omit line numbers if the issue is genuinely file-wide with no single representative line.

**After posting all comments**, set the main PR and all related active PRs to "Wait for author":
1. Call `mcp__azure-devops__repo_vote_pull_request` with `vote: "WaitingForAuthor"` on the main PR.
2. Find related PRs — from the work items fetched in step 3, inspect each work item's `relations` array for entries where `rel == "ArtifactLink"` and `attributes.name == "Pull Request"`. Extract the PR ID from the artifact URL (the last path segment). Exclude the main PR's ID.
3. For each related PR ID, call `mcp__azure-devops__repo_get_pull_request_by_id` to check its status. If `status == 1` (Active), call `mcp__azure-devops__repo_vote_pull_request` with `vote: "WaitingForAuthor"`. Skip completed or abandoned PRs.
4. Report which PRs were set to "Wait for author" and which were skipped.

### 7. Approve PR and related PRs

1. Call `mcp__azure-devops__repo_vote_pull_request` with `vote: "Approved"` on the main PR.
2. Find related PRs using the same method as step 6 (work item artifact links, excluding the main PR).
3. For each related PR ID, call `mcp__azure-devops__repo_get_pull_request_by_id` to check its status. If `status == 1` (Active), call `mcp__azure-devops__repo_vote_pull_request` with `vote: "Approved"`. Skip completed or abandoned PRs.
4. Report which PRs were approved and which were skipped.

## Notes

- Only post comments for failures and uncertainties — not for passing items.
- Only post findings with confidence ≥ 80. Do not report lower-confidence observations.
- If a work item is inaccessible, mark PBI completeness as ⚠️ Uncertain and continue — do not block the review.
- If you cannot determine whether an item passes, mark it ⚠️ Uncertain and explain what could not be verified.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Posting to Azure DevOps without showing chat summary first | Always show the full findings in chat and wait for "Post" or "Approve" before touching Azure DevOps |
| Skipping confirmation when everything passes | Still show the passed summary and wait — the user may want to cancel |
| Using "Post" prompt when all items pass | Use "Approve" prompt when everything passes |
| Posting a comment for every item including passes | Only comment on failures and uncertainties |
| Not fetching the work item | Always fetch it — PBI completeness cannot be checked without it |
| Fetching work items sequentially | Fetch all work items in parallel in one round |
| Running PR fetch and diff fetch sequentially | These are independent — run them in the same parallel round (step 2) |
| Not fetching review history | Always call `repo_list_pull_request_threads` in step 2 to catch unresolved prior-round items |
| Reporting low-confidence findings | Only surface confidence ≥ 80 — silently note the rest |
| Omitting "What this PR does" or "Logic assessment" | Both sections are always required, even for clean PRs |
| Only approving the main PR | Always find and approve related active PRs via work item artifact links |
| Skipping related PR lookup because there are no cherry-pick branches | Any active PR linked to the same work item should be voted on — not just cherry-picks |
