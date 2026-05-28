---
name: review
description: Use when reviewing a pull request in Azure DevOps. Triggers on "review PR", "review this PR", "/review", or any request to review a pull request or give code review feedback.
---

# Review PR

## Overview
Reviews an Azure DevOps PR by inspecting the diff against every item in the reviewer checklist and the developer self-check list, then posts a thread comment on the PR for each item that is not met.

## Steps

### 1. Identify the PR
If a PR ID was given as an argument, use it. Otherwise, get the current branch with `git branch --show-current` and call `mcp__azure-devops__repo_list_pull_requests_by_repo_or_project` filtering by `sourceRefName` to find the open PR.

If no open PR is found, tell the user and stop.

### 2. Fetch PR data and review history in parallel
In a single round, call all of these simultaneously:
- `mcp__azure-devops__repo_get_pull_request_by_id` with `includeWorkItemRefs: true` — to get title, description, source/target branch, and linked work item IDs.
- `mcp__azure-devops__repo_get_pull_request_changes` with `includeDiffs: true` and `includeLineContent: true` — to get the full line-by-line diff.
- `mcp__azure-devops__repo_list_pull_request_threads` — to find unresolved threads from prior review rounds.

Note any `Active` threads from previous rounds. List them in the chat summary under **Open from previous round**. Do not re-post these as new comments, but do verify whether the current diff addresses them.

### 3. Fetch all work items in parallel
Using all work item IDs from `workItemRefs`, call `mcp__azure-devops__wit_get_work_item` for each one simultaneously (with `expand: all`). These are needed to verify "the code does all that is described in the PBI/Bug".

If no work items are linked, note this as ⚠️ Uncertain for the PBI completeness check and continue.

### 3.5. Classify files by priority (PRs with > 15 changed files only)
If the diff touches more than 15 files, classify them before evaluating:

| Priority | File types |
|---|---|
| High | Shared API contracts, controllers, DTOs, services with external callers |
| Medium | Business logic, stores, repositories |
| Low | Config files, migrations, static assets, generated code |

Apply full scrutiny to High files. For Low files, check only secrets and breaking changes.

### 4. Check every checklist item

**Confidence scoring:** For every checklist item evaluated, assign a confidence score (0–100) based on how conclusively the diff evidence supports your finding. **Only surface findings with confidence ≥ 80** in the chat summary and PR comments. Log lower-confidence observations silently but do not report them.

The PR description contains a pre-ticked developer checklist. **Treat every ticked item as a claim to verify against the diff — not as a fact to trust.** A ticked box that is not supported by the diff is a ❌ Fail.

Evaluate all items below. For each one, record: ✅ Pass, ❌ Fail, or ⚠️ Uncertain. For every failure, note the file path and the **modified file** line number (from `modifiedLineNumberStart` in the diff) so the comment can be anchored precisely in step 6.

Determine whether the PR touches **backend** files (`.cs`), **frontend** files (`.vue`, `.ts`, `.scss`), or both, and apply the relevant sections below.

#### Developer checklist — Backend (`.cs` files)
| Item | What to check in the diff |
|---|---|
| Clear PR description | Is the summary meaningful and specific — not just the template boilerplate? |
| New references explained | Any new `.csproj`, NuGet references — are they justified in the description? |
| Comments on new endpoints / difficult code | New controller actions or complex logic — do they have XML doc or inline comments explaining the WHY (not just restating the code)? |
| No sensitive information | Passwords, secrets, API keys, connection strings anywhere in the diff? |
| Methods max 40 effective lines, do 1 thing | Any new/modified method body over 40 non-blank non-comment lines? Multiple responsibilities? |
| No hardcoded values (constants named consistently) | String/number literals in logic code that should be named constants? New constants follow the existing naming style in the file? |
| Exceptions not swallowed | Empty `catch` blocks, bare `catch` without logging, or catches that swallow without rethrowing? |
| Least possible visibility | `public` on things that could be `internal`, `private`, or `protected`? |
| Interfaces over static/abstract | `new ConcreteClass()` injected as dependencies instead of an interface? |
| 70% unit test coverage | Were tests added or updated alongside the production code changes? |


#### Breaking change detection — Backend
Check for unversioned client-facing breaking changes when the PR modifies controllers, DTOs, or API contracts:

| Signal | What to look for |
|---|---|
| Removed endpoint | `[HttpGet]`/`[HttpPost]` etc. route deleted or renamed without an API version bump |
| Renamed DTO field | Public property on a DTO or response model renamed or removed — callers will silently receive `null` |
| Changed field type | Public property type changed (e.g. `int` → `string`) without API versioning |
| Missing API versioning | New or changed public API without `[ApiVersion]` or route versioning |
| Changed enum values | Enum values renamed, removed, or reordered in a serialized contract |

A breaking change that is intentional and versioned is ✅ Pass. An unversioned breaking change is ❌ Fail.

#### Developer checklist — Frontend (`.vue`, `.ts`, `.scss` files)
| Item | What to check in the diff |
|---|---|
| Clear PR description | Is the summary meaningful and specific? |
| New npm references explained | Any new packages in `package.json` — are they justified in the description? Added to the workspace root `frontend/Vue/package.json`, not to an individual project? |
| No sensitive information | API keys, tokens, or secrets hardcoded anywhere? |
| `<script setup lang="ts">` used | No Options API (`export default defineComponent`), no `<script>` without `setup` or `lang="ts"`? |
| Typed props and emits | `defineProps` uses a typed interface, not an untyped array? `defineEmits` is typed? |
| Pinia store for API calls | Components call store actions for data fetching — no direct `http-service` calls from component `<script setup>`? |
| `http-service` helpers used | API calls use the exported `get`/`post`/`put`/`del`/`upload` helpers, never raw `axios`? |
| Loading state pattern | Loading states use `ref<boolean>` with `try/finally` to ensure reset on error? |
| No hardcoded values | Magic strings/numbers extracted to constants or config? |
| 70% unit test coverage | Were tests added or updated alongside component/store changes? |

#### Reviewer checklist (applies to all PRs)
| Item | What to check |
|---|---|
| All developer rules checked | Did you verify all applicable items above? |
| Comments add maintainability value | Are new comments informative, or just noise / restatements of the code? |
| Security concerns addressed | SQL injection, XSS, auth bypass, insecure deserialization, exposed endpoints — anything suspicious? |
| Fits design/architecture/technical plan | Does the implementation approach match the existing patterns in the codebase? No unexpected abstractions or framework misuse? |
| Code does all described in PBI/Bug | Cross-check the work item description against the diff — is everything implemented? |
| Logic flow is sound | Does the new/changed logic make sense end-to-end? Are there edge cases, race conditions, or incorrect assumptions? |

### 5. Present findings in chat

Before posting anything to Azure DevOps, display the full review in the chat using this format:

```
## PR Review: [PR title] (#[ID])

### Open from previous round (if any)
- [Thread summary] — still unresolved / resolved by this diff

### What this PR does
[2–3 sentences describing what the code actually changes and why, based on the diff and work item — not just a restatement of the PR description.]

### Logic assessment
[2–4 sentences evaluating whether the approach and logic flow make sense. Call out any edge cases, incorrect assumptions, or subtle bugs even if they don't map to a checklist item.]

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

**Rules for this step:**
- The "What this PR does" section is always required, even if everything passes.
- The "Logic assessment" section is always required. If the logic is sound, say so explicitly — don't omit the section.
- Every failed or uncertain item must include a confidence score and a concrete suggestion, not just a description of the problem.
- Include the file and line reference next to each failure header as shown.
- Do not truncate or summarise — show the full detail that will also appear in the PR comments.
- Only report findings with confidence ≥ 80.

Wait for the user to reply before proceeding.
- **"Post"** (failures/uncertainties exist) → continue to step 6
- **"Approve"** (everything passed) → continue to step 7
- **"Cancel"** → stop, do not touch AzDO
- Any other reply → treat as feedback, incorporate it, re-display the updated summary, and prompt again

### 6. Post comments for failed items and set PRs to "Wait for author"

For each ❌ Fail or ⚠️ Uncertain item, post a PR thread comment using `mcp__azure-devops__repo_create_pull_request_thread`.

**Comment format:**
```
**Checklist item not met:** [item name]

[1–2 sentences explaining what was found and why it fails the check. Reference the specific file/method if applicable.]
```

**Always anchor comments to the exact location in the diff:**
- Set `filePath` to the file where the problem was found.
- Set `rightFileStartLine` and `rightFileEndLine` to the line numbers in the **modified** file where the problem occurs. Use the `modifiedLineNumberStart` values from the diff blocks to find the right lines.
- If the problem spans a single line, set both `rightFileStartLine` and `rightFileEndLine` to the same line number and set `rightFileStartOffset` to 1 and `rightFileEndOffset` to 1.
- Only omit line numbers if the issue is genuinely file-wide with no single representative line (e.g. missing test file).

Post a separate thread for each ❌ item with enough detail for the author to act on it.

For ⚠️ items, post a thread noting what could not be verified and what the author should double-check.

**After posting all comments**, set the main PR and all active cherry-pick PRs to "Wait for author":
1. Call `mcp__azure-devops__repo_vote_pull_request` with `vote: "WaitingForAuthor"` on the main PR.
2. Find cherry-pick PRs — from the work items already fetched in step 3, inspect each work item's `relations` array for entries where `rel == "ArtifactLink"` and `attributes.name == "Pull Request"`. Extract the PR ID from the artifact URL (the last path segment). Exclude the main PR's ID.
3. For every other PR ID found, call `mcp__azure-devops__repo_get_pull_request_by_id` to check its status. If `status == 1` (Active), call `mcp__azure-devops__repo_vote_pull_request` with `vote: "WaitingForAuthor"` on it as well. Skip completed or abandoned PRs.
4. Report which PRs were set to "Wait for author" and which were skipped.

### 7. Approve PR and cherry-picks (if all items pass)

If everything passes and the user replied "Approve":

1. **Approve the main PR** — call `mcp__azure-devops__repo_vote_pull_request` with `vote: "Approved"`.

2. **Find cherry-pick PRs** — from the work items already fetched in step 3, inspect each work item's `relations` array for entries where `rel == "ArtifactLink"` and `attributes.name == "Pull Request"`. Extract the PR ID from the artifact URL (the last path segment). Exclude the main PR's ID.

3. **Approve each active cherry-pick** — for every other PR ID found, call `mcp__azure-devops__repo_get_pull_request_by_id` to check its status. If `status == 1` (Active), call `mcp__azure-devops__repo_vote_pull_request` with `vote: "Approved"` on it as well. Skip completed or abandoned PRs.

4. **Report** — tell the user which PRs were approved (main + any cherry-picks) and which were skipped (already merged/abandoned).

## Notes

- Do not post a comment for every item — only failures and uncertainties.
- Only post findings with confidence ≥ 80. Do not report lower-confidence observations.
- If you cannot determine whether an item passes (e.g. cannot access the work item), mark it ⚠️ Uncertain and say so.
- Do not block the review if the work item is inaccessible — proceed with what is available and note the gap.
- Reviewer checklist items stay `- [ ]` in the PR description — your job is to post comments, not to tick the boxes yourself.
- Apply only the relevant developer checklist section(s) based on what file types are in the diff.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Only checking reviewer checklist, skipping developer items | Always verify both — the reviewer must confirm the developer items are actually true |
| Posting a comment for every item including passes | Only comment on failures and uncertainties |
| Reporting low-confidence findings | Only surface confidence ≥ 80 — silently note the rest |
| Not fetching the work item | Always fetch it — PBI completeness cannot be checked without it |
| Fetching work items sequentially | Fetch all work items in parallel in one round |
| Running PR fetch and diff fetch sequentially | These are independent — run them in the same parallel round (step 2) |
| Not fetching review history | Always call `repo_list_pull_request_threads` in step 2 to catch unresolved prior-round items |
| Ticking reviewer boxes in the PR description | Post comments only — leave the checkboxes for the human reviewer |
| Posting to AzDO without showing chat summary first | Always show the full findings in chat and wait for "Post" or "Approve" before touching AzDO |
| Skipping the confirmation when there are no failures | Still show the passed summary and wait — the user may want to cancel |
| Using "Post" prompt when all items pass | Use "Approve" prompt when everything passes; "Post" is only for when there are failures/uncertainties to comment |
| Omitting "What this PR does" or "Logic assessment" | Both sections are always required, even for clean PRs |
| Applying backend checklist to frontend-only PRs | Check what file types are in the diff and apply only the relevant checklist(s) |
