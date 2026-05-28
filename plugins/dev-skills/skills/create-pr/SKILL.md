---
name: create-pr
description: Use when creating a pull request for the current branch. Triggers on "create a PR", "open a PR", "raise a PR", "make a pull request", or any request to publish a branch for review.
---

# Create PR

## Overview
Creates a PR with an accurate summary of the changes, auto-complete enabled, work items linked, and work item states advanced appropriately based on type.

## Steps

### 0. Push branch to remote if needed
Check whether the current branch has a remote tracking branch:
```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u}
```

If it returns a tracking branch, the branch is already remote — skip to step 1.

If it returns an error or empty output, push now:
```bash
git push -u origin HEAD
```

Only proceed after this push succeeds.

### 1. Determine target branch
Determine the target branch **before** anything else — every subsequent step depends on it.

#### 1a. Discover long-lived branches
```bash
git fetch origin
git branch -r --format='%(refname:short)'
```

Filter out branches that match short-lived patterns: `origin/feature/*`, `origin/bugfix/*`, `origin/hotfix/*`, `origin/cherry-pick/*`, `origin/sidework/*`, and any branch containing the current branch name. The remaining remote branches (e.g. `origin/develop`, `origin/beta`, `origin/main`, `origin/release/*`) are the candidates.

#### 1b. Find the base by commit comparison
For each candidate, count how many commits are unique to the current branch since it diverged:

```bash
git log origin/<candidate>..HEAD --oneline
```

The candidate with the **fewest unique commits** is the branch this was created from — that is the target.

If two candidates have the same count, or the count looks unexpectedly high for all candidates, ask the user to confirm the target before proceeding.

Store the resolved target branch — all subsequent steps use it.

### 2. Review the diff
Run `git diff <target>...HEAD` (using the target from step 1) to inspect the changes.

Verify the following:
- You can write a meaningful summary of what changed and why
- No sensitive information is present (passwords, secrets, API keys, connection strings)

If sensitive information is found, stop and tell the user before continuing.

### 3. Extract ticket number from branch name
Run `git branch --show-current`. Extract the **first number** found anywhere in the branch name:
- `feature/148917-generate-title` → `148917`
- `bugfix/145646-fix-crash` → `145646`
- `sidework/148937-claude-md` → `148937`

Pattern: `(\d+)` — the first run of digits in the branch name.

If no number is found, ask the user for the ticket ID before continuing. If the user says the ticket number is wrong at any point, stop and ask for the correct one.

### 4. Fetch work item
Call `mcp__azure-devops__wit_get_work_item` with the extracted ID and `expand: all`. **Do NOT pass a `project` parameter** — work items are looked up across all projects and specifying one causes null returns when the work item belongs to a different project.

If the result is null or empty, ask the user for the correct work item ID before continuing.

Note the work item **type** (Task, Bug, User Story, PBI, etc.) and its **parent relation** if present — both are needed for steps 9 and 10.

Use the work item title and description as context when writing the PR summary.

### 5. Build PR title and description

**Title format:** `#<ticket-number> <short description generated from the diff>`

The short description should be a concise phrase (5–10 words) summarising the core change, derived from what the diff actually does — not copied from the branch name or work item title.

**Description structure:**
```markdown
## Summary
- [Bullet 1 — what changed]
- [Bullet 2 — why / what it fixes or enables]

## Work Item
[Work item title] — #[ID]
```

The summary must describe what the code actually changes. Vague descriptions like "fix bug" or "implement PBI" are not acceptable.

### 6. Detect the repository
Extract the repository name from the git remote:
```bash
git remote get-url origin
```

Parse the repository name from the URL (the last path segment, without `.git`).

Call `mcp__azure-devops__repo_get_repo_by_name_or_id` with that name to retrieve the repository GUID. Store the GUID — it is required for linking the work item in step 8.

### 7. Create the PR
Call `mcp__azure-devops__repo_create_pull_request` with:
- `repositoryId`: repository name (from step 6)
- `title`: title from step 5
- `description`: description from step 5
- `sourceRefName`: current branch (prefix with `refs/heads/`)
- `targetRefName`: branch from step 1 (prefix with `refs/heads/`)

**After the call, verify the PR was created.** The API sometimes returns no data even when creation succeeded. Immediately call `mcp__azure-devops__repo_list_pull_requests_by_commits` using the HEAD commit hash to retrieve the PR ID. If that tool is unavailable, call `mcp__azure-devops__repo_get_pull_request_by_id` incrementing from the last known PR ID until the PR is found. Do not proceed to step 8 without a confirmed PR ID.

### 8. Enable auto-complete
Immediately after confirming the PR ID, call `mcp__azure-devops__repo_update_pull_request` with:
- `autoComplete: true`
- `deleteSourceBranch: true`
- `transitionWorkItems: false`

**This step is mandatory.** Do not report the PR as created without completing it.

### 9. Resolve work items to link and update
The work item type fetched in step 4 determines what gets linked and what state transitions to make.

#### If the work item is a **Task**:

1. Move the Task to `Done`.
2. Check whether the Task has a parent (from the `relations` array in the step 4 response, look for a relation with `rel == "System.LinkTypes.Hierarchy-Reverse"`).
3. If a parent exists, fetch it with `mcp__azure-devops__wit_get_work_item` (`expand: all`).
4. Determine whether the parent is a **real PBI/Bug** or a **placeholder**:
   - **Placeholder**: generic title (e.g. "Sidework", "Miscellaneous", "Backlog"), empty or near-empty description, no acceptance criteria — **do not link or update it**.
   - **Real PBI/Bug**: meaningful title describing a feature or defect, has a description or acceptance criteria — **link it to the PR and move it to `For Review`**.
5. Always link the Task itself to the PR regardless of parent type.

#### If the work item is a **Bug, User Story, or PBI**:

1. Link it to the PR.
2. Move it to `For Review`.

#### Linking work items to the PR
Call `mcp__azure-devops__wit_link_work_item_to_pull_request` for each work item being linked.

**Critical:** The `repositoryId` parameter must be the repository **GUID** (retrieved in step 6), not the name. Passing the name silently returns `success: true` but creates no link.

#### Updating work item states
Call `mcp__azure-devops__wit_update_work_item` for each state transition above.

If a state update fails with an unsupported state error, skip it silently and note it in the final summary.

### 10. Update or create the Manual Testing task

Identify the **parent PBI/Bug** to use as the anchor:
- If the linked work item is a Task and has a real parent (from step 9): use that parent.
- If the linked work item is a Bug/PBI directly: use it as the anchor.
- If the linked work item is a Task with a placeholder parent: skip this step entirely — there is no meaningful parent to attach testing to.

#### 10a. Find an existing Manual Testing task
Fetch the children of the parent PBI/Bug: look in the `relations` array for entries with `rel == "System.LinkTypes.Hierarchy-Forward"` and fetch each child with `mcp__azure-devops__wit_get_work_item`.

Search for a child Task whose title contains "Manual Testing" (case-insensitive).

#### 10b. Generate the test plan
Based on the diff and work item context, generate a concise test plan:

```
## Test Plan — #<PR-ID> <short PR title>

**What to test:** [1–2 sentences on what this change does from a user/system perspective]

**Steps:**
1. [Step]
2. [Step]
...

**Expected result:** [What correct behaviour looks like]

**Edge cases to verify:**
- [Edge case 1]
- [Edge case 2]
```

Keep it practical — steps a tester can follow without reading the code.

#### 10c. If the Manual Testing task exists
Call `mcp__azure-devops__wit_get_work_item` to read its current description. Append the generated test plan to the existing description (do not overwrite). Call `mcp__azure-devops__wit_update_work_item` to save the updated description.

#### 10d. If no Manual Testing task exists
Call `mcp__azure-devops__wit_create_work_item` to create a new Task with:
- `title`: `Manual Testing`
- `description`: the generated test plan from 10b
- `workItemType`: `Task`

Then call `mcp__azure-devops__wit_add_child_work_items` (or add a `System.LinkTypes.Hierarchy-Reverse` relation) to link the new task as a child of the parent PBI/Bug.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Not pushing the branch before creating the PR | Always run step 0 first — the remote must have the branch |
| Determining target branch too late | Step 1 must resolve the target — diff and all subsequent steps depend on it |
| Running pre-flight diff against the wrong branch | Always use `git diff <target>...HEAD` with the target from step 1 |
| Skipping the sensitive info check | Always scan the diff before creating the PR |
| Skipping auto-complete | Always call update PR immediately after create |
| Not linking the work item | Always call link after PR is created |
| Moving a Task to "For Review" instead of "Done" | Tasks always go to Done on PR creation — only Bugs/PBIs/User Stories go to For Review |
| Skipping parent lookup for Task work items | Always fetch the parent and evaluate whether it is a real PBI/Bug or a placeholder |
| Linking a placeholder parent PBI to the PR | Only link the parent if it has a meaningful title and description — ignore sidework containers |
| Not linking the parent PBI when it is a real feature or bug | A fleshed-out parent should be linked to the PR and moved to For Review |
| Passing the repo name instead of GUID to `wit_link_work_item_to_pull_request` | The API silently returns success with a name but creates no link — always use the GUID |
| Assuming the PR was created because the API returned no error | Always verify the PR ID before proceeding |
| Hardcoding `develop` as the target | Always auto-discover long-lived branches — teams use different names (`develop`, `beta`, `main`, etc.) |
| Assuming standard prefix means expected target | A `bugfix/*` may have been created from a different base — always verify via commit count |
| Copying work item title as PR description | The summary must describe what the diff actually changes |
| Skipping the Manual Testing task when there is a real parent PBI/Bug | Always look for an existing Manual Testing task and update or create it |
| Overwriting the Manual Testing task description | Always read the existing description first and append the new test plan — never replace |
| Creating a Manual Testing task under a placeholder parent | Only create/update the task when the parent is a real PBI/Bug |
| Skipping the Manual Testing step for directly linked Bugs/PBIs | The anchor is the Bug/PBI itself — fetch its children and find or create the task |
| Passing `project` to `wit_get_work_item` | Work items live across projects — specifying one causes null returns |
