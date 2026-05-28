---
name: create-pr
description: Use when creating a pull request for the current branch in Azure DevOps. Triggers on "create a PR", "open a PR", "raise a PR", "make a pull request", or any request to publish a branch for review.
---

# Create PR

## Overview
Creates an Azure DevOps PR with work item context, a pre-ticked developer checklist, auto-complete enabled, and the work item linked. If the target is a release branch, automatically creates cherry-pick branches and PRs for every newer release branch and for `develop`. Steps 0–9 are always mandatory; step 10 applies to release-branch targets only.

## Steps

### 0. Push branch to remote if needed
Before doing anything else, ensure the current branch exists in the remote.

Check whether the current branch has a remote tracking branch:
```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u}
```

If the command returns a tracking branch (e.g. `origin/feature/12345-my-branch`), the branch is already in the remote — skip to step 1.

If the command returns an error or empty output, the branch is not yet pushed. Push it now:
```bash
git push -u origin HEAD
```

Only proceed to step 1 after this push succeeds.

### 1. Determine target branch
Determine the target branch **before** anything else — every subsequent step depends on it.

For standard prefixes:

| Branch prefix | Target branch |
|---|---|
| `feature/*` | `develop` |
| `bugfix/*` | `develop` |
| `cherry-pick/*` | Parse the target from the branch name suffix — `cherry-pick/148917-generate-title-v071` → `release/v071`, `cherry-pick/148937-generate-title-develop` → `develop`. If no recognizable suffix is present, ask the user. |

For **non-standard prefixes** (e.g. `sidework/*`, `hotfix/*`, or any other prefix not listed above), detect the base branch automatically by comparing unique commits:

```bash
git fetch origin
git log --oneline origin/develop..HEAD
git log --oneline origin/release/vXX..HEAD   # repeat for each known release branch
```

The target is the branch with the **fewest unique commits** — that is the branch this was created from. If the counts are ambiguous, ask the user to confirm.

**Even for standard prefixes, verify the commit count.** Run `git log origin/<expected-target>..HEAD --oneline` after resolving the prefix. If the result contains dozens of unexpected commits (e.g. old merge commits from a release branch), the branch was likely created from a release branch rather than the expected target. In that case, compare against known release branches to find the real base, and **ask the user to confirm the target before proceeding**.

Store the resolved target branch — all subsequent steps use it.

### 2. Pre-flight checklist gate
Run `git diff <target>...HEAD` (using the target from step 1) to inspect the changes.

**Hard stop — sensitive information:** Before anything else, scan the diff for passwords, secrets, connection strings, or API keys in config or code files. If any are found, **stop immediately** and tell the user. Do not proceed until the sensitive information is removed.

Then verify each remaining developer checklist item:

| Checklist item | How to verify |
|---|---|
| Clear PR description | You will write this — ensure it describes the change meaningfully |
| New references explained | Scan diff for new `.csproj` references, NuGet packages, or npm imports — if any, confirm they're explained in the summary |
| Comments on new endpoints / difficult code | Scan diff for new controller actions, service methods, or complex logic — check for XML doc / inline comments |
| Methods do 1 thing, max 40 effective lines | Scan diff for new/modified methods — flag any over 40 non-blank, non-comment lines |
| No hardcoded values (constants are SNAKE_CASE) | Scan diff for string/number literals outside of test files or constant declarations |
| Unused code removed | Scan diff for commented-out blocks or variables that are declared but never used |
| Exceptions not swallowed | Scan diff for empty `catch` blocks or catches that only log without rethrowing |
| Least possible visibility | Scan diff for `public` on methods/classes that could be `internal`, `private`, or `protected` |
| Interfaces used over static/abstract | Scan diff for `new ConcreteClass()` injected as dependencies instead of interfaces |
| 40% unit test coverage on new code | Check if test files were added or modified alongside the changed production code |

After checking, present any **potential violations** to the user:

```
The following checklist items may not be fully met:
- [item]: [brief reason]
- [item]: [brief reason]

Reply with:
  "Ignore" — to proceed with the PR as-is
  "Fix" — to have me address the issues before creating the PR
```

If the user says **"Fix"**, address each issue in the code before continuing to step 3.
If the user says **"Ignore"**, proceed directly to step 3.
If there are **no violations**, skip this prompt and proceed automatically.

### 3. Extract PBI from branch name
Run `git branch --show-current`. Extract the **first number** found anywhere in the branch name:
- `feature/148917-generate-title` → `148917`
- `cherry-pick/148917-generate-title-develop` → `148917`
- `sidework/148937-claude-md` → `148937`
- `bugfix/145646-fix-crash` → `145646`

Pattern: `(\d+)` — the first run of digits in the branch name, regardless of prefix.

If no number is found, ask the user for the PBI before continuing. If the user says the PBI is wrong at any point, stop and ask for the correct one.

### 4. Fetch work item
Call `mcp__azure-devops__wit_get_work_item` with the extracted ID and `expand: all`. **Do NOT pass a `project` parameter** — work items are looked up across all projects and specifying a project causes null returns when the work item belongs to a different project.

If the result is null or empty, ask the user for the correct work item ID before continuing.

Note the work item **type** (Task, Bug, User Story, PBI, etc.) and its **parent relation** if present (relation with `rel == "System.LinkTypes.Hierarchy-Reverse"`) — both are needed for steps 8, 9, and 10.

Use the work item title and description to write a meaningful PR summary.

### 5. Build PR description
Use this structure, filling in content from the work item:

```markdown
## Summary
- [Bullet 1 — what changed]
- [Bullet 2 — why / what it fixes]

## Work Item
[Work item title] — #[ID]

##### CODE REVIEW CHECKLIST FOR all development
- [X] I used a clear description for this PR (above this block)
- [X] The PR description explains why I added any new reference (project/NuGet/npm). I did not reference projects of a higher order.
- [X] My code has comments for new endpoints and for difficult code
- [X] I didn't include sensitive information (e.g., passwords) in the config or any other file
- [X] My methods only do 1 thing (SOLID) and only have max 40 effective lines of code
- [X] I did not hard code anything. If I did need constants they are isolated and named as SNAKE_CASE
- [X] I removed unused code
- [X] My code doesn't swallow exceptions. I throw strongly typed exceptions.
- [X] My classes and methods have the least possible visibility (private, protected, internal etc.)
- [X] My code is unit-testable: I used interfaces rather than static or abstract classes.
- [X] My newly written code is covered with at least 40% unit tests

##### CODE REVIEW CHECKLIST FOR reviewers
- [ ] All rules from the code review checklist for developers are checked and reviewed
- [ ] The comments add something to the maintainability of the code
- [ ] Security concerns have been addressed
- [ ] The functionality fits the current design/architecture/technical plan
- [ ] The code does all that is described in the PBI/Bug
```

**Critical checklist rule:** Every `- [ ]` under "CODE REVIEW CHECKLIST FOR all development" must be `- [x]`. Every item under "CODE REVIEW CHECKLIST FOR reviewers" must stay `- [ ]`. Do not tick the reviewer section.

### 6. Detect the repository
The Communities team has multiple repositories. Extract the repository name from the git remote:
```bash
git remote get-url origin
```

Parse the repository name from the URL (the last path segment, without `.git`).

Call `mcp__azure-devops__repo_get_repo_by_name_or_id` with that name to retrieve the repository GUID. Store both the name and GUID — they are required for creating the PR and linking work items in steps 7 and 8.

### 7. Create the PR
Call `mcp__azure-devops__repo_create_pull_request` with:
- `repositoryId`: repository name detected in step 6
- `title`: `Merge <source-branch> into <target-branch>` — use the full branch names (e.g. `Merge feature/148917-generate-title into develop`)
- `description`: Full description from step 5
- `sourceRefName`: current branch (prefix with `refs/heads/`)
- `targetRefName`: branch from step 1 (prefix with `refs/heads/`)

**After the call, verify the PR was created:** The API sometimes returns no data even when creation succeeded. Immediately call `mcp__azure-devops__repo_list_pull_requests_by_commits` using the HEAD commit hash to retrieve the PR ID. If that tool is unavailable, call `mcp__azure-devops__repo_get_pull_request_by_id` incrementing from the last known PR ID until the PR is found. Do not proceed to step 8 without a confirmed PR ID.

### 8. Enable auto-complete
Immediately after confirming the PR ID, call `mcp__azure-devops__repo_update_pull_request` with:
- `autoComplete: true`
- `deleteSourceBranch: true`
- `transitionWorkItems: false` — work item state is managed manually, not on merge
- `mergeStrategy`: `NoFastForward` for release branches, `Squash` for `develop`

**This step is mandatory.** Do not report the PR as created without completing this step. If the merge strategy is rejected by policy, retry without specifying `mergeStrategy`.

### 9. Resolve work items to link and update

The work item type from step 4 determines what gets linked and what state transitions to make.

#### If the work item is a **Task**:

1. Move the Task to `Done`.
2. Check whether the Task has a parent (from the `relations` array, look for `rel == "System.LinkTypes.Hierarchy-Reverse"`).
3. If a parent exists, fetch it with `mcp__azure-devops__wit_get_work_item` (`expand: all`).
4. Determine whether the parent is a **real PBI/Bug** or a **placeholder**:
   - **Placeholder**: generic title (e.g. "Sidework", "Miscellaneous", "Backlog"), empty or near-empty description — **do not link or update it**.
   - **Real PBI/Bug**: meaningful title and description — **link it to the PR and move it to `For Review`**.
5. Always link the Task itself to the PR regardless of parent type.

#### If the work item is a **Bug, User Story, or PBI**:

1. Link it to the PR.
2. Move it to `For Review`.

#### Linking work items to the PR
Call `mcp__azure-devops__wit_link_work_item_to_pull_request` for each work item being linked.

**Critical:** The `repositoryId` parameter must be the repository **GUID** retrieved in step 6, not the name. Passing the name silently returns `success: true` but creates no link.

#### Updating work item states
Call `mcp__azure-devops__wit_update_work_item` for each state transition above.

If a state update fails with an unsupported state error, skip it silently and note it in the final summary.

### 10. Update or create the Manual Testing task

Identify the **parent PBI/Bug** to use as the anchor:
- If the linked work item is a Task and has a real parent (from step 9): use that parent.
- If the linked work item is a Bug/PBI directly: use it as the anchor.
- If the linked work item is a Task with a placeholder parent: **skip this step entirely**.

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

Then link the new task as a child of the parent PBI/Bug using a `System.LinkTypes.Hierarchy-Reverse` relation.

### 11. Auto cherry-pick to newer branches (release targets only)

**Skip this step entirely if the target branch from step 1 is `develop`.**

If the target is `release/vXX`, perform the following for every release branch newer than `vXX` and then for `develop` (always last).

#### 11a. Discover newer release branches
Call `mcp__azure-devops__repo_list_branches_by_repo` with a name filter for `release/v`. Parse the version number from each branch name (`release/v071` → `71`, `release/v072` → `72`). Keep only those with a version number **greater than** the target release version. Sort ascending so the lowest version is processed first. Append `develop` to the end of the list.

**`develop` is ALWAYS the last entry — even when there are no newer release branches.**

Example for target `release/v071` with branches `release/v071`, `release/v072` existing:
→ cherry-pick list: `[release/v072, develop]`

Example for target `release/v072` with no newer release branches:
→ cherry-pick list: `[develop]`

#### 11b. Build cherry-pick branch names
Extract the short description from the current branch name by stripping the prefix and PBI number:
- `feature/148917-generate-title-loadbalancer` → description = `generate-title-loadbalancer`
- `cherry-pick/148917-generate-title-v071` → description = `generate-title` (strip the trailing `-v071` suffix)
- `sidework/148937-claude-md` → description = `claude-md`

Cherry-pick branch name format: `cherry-pick/<PBI>-<description>-<target-suffix>`
- target suffix for `release/v072` → `v072`
- target suffix for `develop` → `develop`

Examples:
- `cherry-pick/148917-generate-title-loadbalancer-v072`
- `cherry-pick/148937-claude-md-develop`

#### 11c. Record the original branch and commits to carry
```
original_branch = git branch --show-current
commits = git log origin/<initial-target>..HEAD --reverse --pretty=format:"%H"
```
`<initial-target>` is the release branch from step 1 (e.g. `release/v071`). This gives the ordered list of commits unique to the current branch that need to travel forward.

#### 11d. For each target in the cherry-pick list

Run these steps in order. If one target fails, report it and continue with the next — do not abort the whole list.

1. `git fetch origin` — ensure the target branch is up to date locally
2. `git checkout -b <cherry-pick-branch> origin/<target>` — create the cherry-pick branch from the remote target
3. `git cherry-pick <commit1> <commit2> ...` — apply all commits from 11c in order
4. **If a conflict occurs:**
   - Run `git diff` to show the conflict markers
   - Show the conflict to the user and ask how to resolve it:
     - **"Take ours"** — `git checkout --theirs <file>` then `git add <file>` then `git cherry-pick --continue --no-edit`
     - **"Take theirs"** — `git checkout --ours <file>` then `git add <file>` then `git cherry-pick --continue --no-edit`
     - **"Resolve manually"** — abort and hand off: run `git cherry-pick --abort`, then `git checkout <original_branch>`, then report: "⚠️ Cherry-pick to `<target>` has conflicts. Resolve manually: `git checkout -b <cherry-pick-branch> origin/<target> && git cherry-pick <commits>`", then skip to the next target
   - After resolving, continue with step 5 (push)
5. `git push origin <cherry-pick-branch>`
6. Create a PR via `mcp__azure-devops__repo_create_pull_request`:
   - Title: `Merge <cherry-pick-branch> into <target>` (same format as step 7)
   - Same description structure as step 5, but add a note at the top of the Summary: `> Cherry-pick of !<original-PR-ID> to <target>` — use `!` not `#`, as `#` links to work items in Azure DevOps
   - `sourceBranch`: `refs/heads/<cherry-pick-branch>`
   - `targetBranch`: `refs/heads/<target>`
7. Verify the PR was created (same verification as step 7)
8. Enable auto-complete — call `mcp__azure-devops__repo_update_pull_request` with `autoComplete: true`, `deleteSourceBranch: true`, `transitionWorkItems: false`, and `mergeStrategy: NoFastForward` for release branch targets or `Squash` for `develop`. If the merge strategy is rejected by policy, retry without specifying `mergeStrategy`.
9. Link the work item to the new PR — call `mcp__azure-devops__wit_link_work_item_to_pull_request` using the repository **GUID** from step 6, not the name.
10. `git checkout <original_branch>` — return to the original branch before processing the next target

#### 11e. Report the outcome
After all targets are processed, summarise in chat:

```
Cherry-picks completed:
✅ release/v072  → PR #[ID]: [title]
✅ develop       → PR #[ID]: [title]

⚠️ Skipped (conflicts):
- release/v073: resolve manually with: git checkout -b cherry-pick/... origin/release/v073 && git cherry-pick ...
```

### 12. Final summary
Once all steps are complete, report the full outcome in chat:

```
✅ PR created: Merge <source> into <target> — PR #[ID]

Work items updated:
- #[ID] [title] → [state]
- #[ID] [parent title] → For Review  ← only if a real parent was linked

Manual Testing task: [updated on / created on] #[parent ID]  ← only if applicable

Cherry-picks:
✅ release/vXX → PR #[ID]: [title]
✅ develop     → PR #[ID]: [title]
⚠️ Skipped (conflicts): [branch] — resolve manually with: git checkout -b ...
```

Omit sections that don't apply (e.g. no cherry-picks for `develop` targets, no parent if it was a placeholder).

## Common Mistakes

| Mistake | Fix |
|---|---|
| Not pushing the branch before creating the PR | Always run step 0 first — the remote must have the branch before a PR can be created |
| Determining target branch too late | Step 1 must resolve the target — pre-flight diff and all subsequent steps depend on it |
| Running pre-flight diff against `develop` when target is a release branch | Always use `git diff <target>...HEAD` with the target from step 1, never hardcode `develop` |
| Skipping the pre-flight gate | Always run step 2 — never assume the code is clean |
| Skipping repository detection | Always run step 6 — the Communities team has multiple repos and the name must be derived from the git remote |
| Skipping auto-complete | Always call update PR immediately after create — never skip |
| Developer checklist items unticked | All items in dev section use `[X]` — copy the exact wording above |
| Reviewer section ticked | Reviewer items always stay `- [ ]` |
| Not linking the work item | Always call link after PR is created |
| Wrong target for cherry-pick branches | Parse the suffix from the branch name first — only ask the user if no suffix is found |
| PBI not verified | If user says PBI is wrong, stop and ask before proceeding |
| Skipping gate when user says "Ignore" | Still proceed with `[X]` on all dev checklist items — "Ignore" means skip fixing, not skip the PR |
| Running step 11 for a `develop` target | Only run step 11 when the target is a release branch — `develop` needs no cherry-picks |
| Skipping the `develop` cherry-pick when there are no newer release branches | `develop` is ALWAYS the last entry in the cherry-pick list for any release branch target — even if no newer release branches exist |
| Cherry-picking without fetching first | Always `git fetch origin` before creating each cherry-pick branch |
| Not returning to the original branch after each cherry-pick | Always `git checkout <original_branch>` after each target, even on failure |
| Aborting all cherry-picks because one had conflicts | Report the conflict and continue with remaining targets |
| Using the wrong commit range for cherry-pick | Use `git log origin/<initial-release-target>..HEAD` — not `HEAD~n` or a fixed count |
| Passing `project` to `wit_get_work_item` | Never pass a project — work items can live in any project and specifying one causes null returns |
| Moving a Task to "For Review" instead of "Done" | Tasks always go to Done — only Bugs/PBIs/User Stories go to For Review |
| Skipping parent lookup for Task work items | Always fetch the parent and evaluate whether it is a real PBI/Bug or a placeholder |
| Linking a placeholder parent PBI to the PR | Only link the parent if it has a meaningful title and description — ignore sidework containers |
| Not linking the parent PBI when it is a real feature or bug | A fleshed-out parent should be linked to the PR and moved to For Review |
| Skipping the Manual Testing task when there is a real parent PBI/Bug | Always look for an existing Manual Testing task and update or create it |
| Overwriting the Manual Testing task description | Always read the existing description first and append the new test plan — never replace |
| Creating a Manual Testing task under a placeholder parent | Only create/update the task when the parent is a real PBI/Bug |
| Assuming the PR was created because the API returned no error | Always verify the PR ID after creation before proceeding to auto-complete and linking |
| Using branch prefix to determine target for non-standard branches | Non-standard prefixes (sidework, hotfix, etc.) require git log comparison to detect the base branch |
| Passing the repo name instead of GUID to `wit_link_work_item_to_pull_request` | The API silently returns `success: true` with a name but creates no link — always use the GUID from step 6 |
| Not setting `deleteSourceBranch: true` on auto-complete | Branches won't be deleted on merge — always include `deleteSourceBranch: true` when enabling auto-complete |
| Aborting cherry-pick conflicts without showing them to the user | Always show `git diff` output first and offer resolution options — the user may be able to resolve in seconds |
| Assuming standard prefix means expected target branch | A `bugfix/*` branch may have been created from a release branch — verify commit count before assuming the target |
