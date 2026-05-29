---
name: write-test-plan
description: |
  Create a test plan in Azure DevOps (InSites Eco project) from a work item. Use this skill whenever the user asks to "write a test plan for PBI X", "create a test plan for work item X", "generate test cases for X", or any variation. Trigger on phrases like "test plan for", "create tests for PBI", "write test plan", "generate test cases for work item", or when given a work item ID and asked about testing. Also trigger when the user says things like "can you test plan this?" or pastes a PBI number in context of QA/testing.
---

# ADO Test Plan Creator — InSites Eco

You create test plans in Azure DevOps for the InSites Eco project from a work item (PBI). The full flow: fetch the PBI → analyse acceptance criteria → generate test cases → create everything in ADO.

**Prerequisites:** `az` CLI authenticated as the current user (`az account show` to verify).

---

## Permissions note

Two distinct permission levels apply:

| Operation | Required role | Works? |
|-----------|--------------|--------|
| Create test plan / suites | **Test Manager** in ADO | May fail with 401 |
| Create test case work items | Contributor | Always works |
| Add test cases to an existing suite | Test Manager | May fail with 401 |

**If test plan creation returns "You are not authorized":**
1. Tell the user: "You need the **Test Manager** role in Azure DevOps to create test plans. You can request it from your project admin, or create the plan container manually in the UI."
2. Offer **Lite mode**: create all test case work items anyway, tagged to the PBI's area/iteration, and give the user their IDs so they can drag them into a plan manually.
3. If the user says "just use an existing plan", ask which plan ID to use (or list recent ones with `az devops invoke --area testplan --resource plans --route-parameters project="InSites Eco" --api-version "7.0"`) and skip plan creation — go straight to creating test cases and adding them to the specified plan.

Do NOT silently fail. Always report the 401 and offer alternatives.

---

## Step 0: Decision — create vs adapt

Before doing anything else, determine whether a test plan already exists for this work item.

```bash
az devops invoke \
  --area testplan --resource plans \
  --route-parameters project="InSites Eco" \
  --query-parameters filterActivePlans=false \
  --api-version "7.0" \
  --output json > /tmp/all_plans.json

python -c "
import json, sys
plans = json.load(open('/tmp/all_plans.json'))
wid = sys.argv[1]
matches = [p for p in plans.get('value', []) if p['name'].startswith(wid + ' -') or p['name'].startswith('#' + wid)]
for m in matches:
    print(m['id'], m['name'])
" "<WORK_ITEM_ID>"
```

**If a match is found** → you are in **Adapt mode**. Note the `planId` and skip to [Adapt mode](#adapt-mode-extend-an-existing-plan). Do NOT create a new plan.

**If no match is found** → proceed with Steps 1–7 below to create the plan from scratch.

---

## Step 1: Fetch the work item

```bash
az boards work-item show --id <ID> --output json
```

Extract from the response:
- `System.Title` → use in the test plan name
- `System.AreaPath` → reuse for the test plan's area path
- `System.IterationPath` → reuse for the test plan's iteration
- `Microsoft.VSTS.Common.AcceptanceCriteria` → HTML, strip tags to get the raw AC text
- `System.Description` → additional context for understanding scope

Strip HTML from AC before reasoning about it. Use Python inline:
```bash
python -c "
import sys, re, json
d = json.load(open('wi.json'))
ac = d['fields'].get('Microsoft.VSTS.Common.AcceptanceCriteria', '')
print(re.sub(r'<[^>]+>', ' ', ac).strip())
"
```

Or just reason over the raw HTML — you can read it well enough.

---

## Step 2: Analyse the acceptance criteria → derive test cases

Read the AC carefully. For each verifiable statement ("User can...", "The toast says...", "Tab is only shown when...") derive:
- **1 happy-path test case** — the thing works as described
- **1 negative/edge-case test case** — what happens when the condition is not met

Group test cases into **suites** by feature area or flow. Typical suite names:
- "Happy Path"
- "Edge Cases / Boundary Conditions"
- "UI / Copy Verification"
- "Accessibility"
- "Notifications" (if the AC covers notifications specifically)

Keep it pragmatic: 2–4 suites, 3–8 test cases each. Don't over-generate.

---

## Step 3: Create the test plan

Write the plan body to a temp file, then POST it.

```bash
python -c "
import json
plan = {
    'name': '<ID> - <Short PBI Title>',
    'areaPath': '<System.AreaPath value>',
    'iteration': '<System.IterationPath value>'
}
open('/tmp/plan.json', 'w').write(json.dumps(plan))
"

az devops invoke \
  --area testplan --resource plans \
  --http-method POST \
  --in-file /tmp/plan.json \
  --route-parameters project="InSites Eco" \
  --api-version "7.0" \
  --output json > /tmp/plan_result.json

python -c "import json; r=json.load(open('/tmp/plan_result.json')); print('Plan ID:', r['id'], '| Root Suite ID:', r['rootSuite']['id'])"
```

Save **planId** and **rootSuiteId** — you need them for every subsequent call.

---

## Step 4: Create test suites

For each suite group you identified in Step 2, create a static test suite under the root suite:

```bash
python -c "
import json
suite = {
    'suiteType': 'StaticTestSuite',
    'name': 'Happy Path',
    'parentSuite': {'id': <rootSuiteId>}
}
open('/tmp/suite.json', 'w').write(json.dumps(suite))
"

az devops invoke \
  --area testplan --resource suites \
  --http-method POST \
  --in-file /tmp/suite.json \
  --route-parameters project="InSites Eco" planId=<planId> \
  --api-version "7.0" \
  --output json > /tmp/suite_result.json

python -c "import json; r=json.load(open('/tmp/suite_result.json')); print('Suite ID:', r['id'])"
```

Repeat for each suite. Collect all **suiteId** values.

---

## Step 5: Create test case work items

For each test case, create a "Test Case" work item. Build the steps XML first, then create the work item.

**Steps XML format:**
```xml
<steps id="0" last="3">
  <step id="1" type="ActionStep">
    <parameterizedString isformatted="true">Navigate to [feature area]</parameterizedString>
    <parameterizedString isformatted="true">Feature area is visible</parameterizedString>
    <description/>
  </step>
  <step id="2" type="ActionStep">
    <parameterizedString isformatted="true">Perform the action described in AC</parameterizedString>
    <parameterizedString isformatted="true">Expected outcome matches AC</parameterizedString>
    <description/>
  </step>
</steps>
```

Rules for steps:
- `last` attribute = total number of steps
- Step IDs start at 1, increment by 1
- Each step has an **action** (what to do) and an **expected result** (what should happen)
- Keep steps concrete and user-facing — not implementation details
- 2–5 steps per test case is usually right

**Create the work item:**
```bash
az boards work-item create \
  --type "Test Case" \
  --title "Verify that [specific AC statement]" \
  --project "InSites Eco" \
  --area "<System.AreaPath>" \
  --iteration "<System.IterationPath>" \
  --output json > /tmp/tc_result.json

python -c "import json; r=json.load(open('/tmp/tc_result.json')); print('Test Case ID:', r['id'])"
```

**Add the steps to the work item** (separate update call via `az boards work-item update`):

Build the steps XML as a single-line string, then pass it via `--fields`. The `az devops invoke wit/workItems PATCH` route has a known bug on Windows (`KeyError: 'type'`) — use `az boards work-item update` instead.

```bash
# Build the XML in Python to avoid shell escaping issues, write to a temp file, then pass it
python -c "
import subprocess, sys

steps = [
    ('Navigate to [feature area]', 'Feature area is visible'),
    ('Perform the action described in AC', 'Expected outcome matches AC'),
]

def steps_xml(steps):
    parts = [f'<steps id=\"0\" last=\"{len(steps)}\">']
    for i, (a, e) in enumerate(steps, 1):
        for ch, rep in [('&','&amp;'),('<','&lt;'),('>','&gt;'),('\"','&quot;')]:
            a, e = a.replace(ch, rep), e.replace(ch, rep)
        parts.append(f'<step id=\"{i}\" type=\"ActionStep\"><parameterizedString isformatted=\"true\">{a}</parameterizedString><parameterizedString isformatted=\"true\">{e}</parameterizedString><description/></step>')
    parts.append('</steps>')
    return ''.join(parts)

xml = steps_xml(steps)
result = subprocess.run(
    ['az.cmd', 'boards', 'work-item', 'update',
     '--id', '<testCaseId>',
     '--fields', f'Microsoft.VSTS.TCM.Steps={xml}',
     '--output', 'none'],
    capture_output=True, text=True)
print('OK' if result.returncode == 0 else result.stderr[:200])
"
```

When creating many test cases at once, write a Python script that loops over all (id, steps) pairs — it's much cleaner than repeating this in bash.

Repeat for each test case. Collect all **testCaseId** values.

---

## Step 6: Add test cases to their suites

```bash
python -c "
import json
# List of test case IDs to add to this suite
tc_ids = [<id1>, <id2>]
body = [{'testCase': {'id': str(i)}} for i in tc_ids]
open('/tmp/add_tc.json', 'w').write(json.dumps(body))
"

az devops invoke \
  --area testplan --resource suiteTestCase \
  --http-method POST \
  --in-file /tmp/add_tc.json \
  --route-parameters project="InSites Eco" planId=<planId> suiteId=<suiteId> \
  --api-version "7.0" \
  --output none
```

Repeat for each suite with its corresponding test case IDs.

---

## Step 7: Report back

Tell the user:
- The test plan URL: `https://dev.azure.com/insites/InSites%20Eco/_testPlans/define?planId=<planId>`
- How many suites and test cases were created
- A brief summary of what's covered (one line per suite)

---

## Test case title conventions

Follow the pattern used in InSites Eco:
- Start with "Verify that…" or "Confirm that…"
- Be specific about the feature and the expected state
- Keep under 120 characters

**Good:** `Verify that clip-ready notification routes user to Clips tab`
**Bad:** `Test notification`

---

## What to do if the AC is missing or vague

If `Microsoft.VSTS.Common.AcceptanceCriteria` is empty or just boilerplate ("Given some context…"), fall back to `System.Description`. If both are vague, generate test cases based on the PBI title alone and call out to the user: "The acceptance criteria is thin — I've written test cases based on the description. You may want to review these before running them."

---

## Error handling

- **401 on test plan creation** → see Permissions note above. Switch to Lite mode, don't stop.
- **Any other error on `az devops invoke`** → print the full response and stop — don't continue creating dependent resources with bad IDs.
- **Wrong tenant** → if `az account show` shows a tenant other than `wearehuman8.com`, tell the user to run `az login --tenant wearehuman8.com` before proceeding.
- **Area path / iteration not found** → plan creation returns 400. Fall back to `areaPath: "InSites Eco"` and `iteration: "InSites Eco"` and retry once.
- **Test case deletion** → test case work items cannot be deleted via CLI (`az boards work-item delete` returns an error for test artifacts). If you create a test case by mistake, tell the user to delete it manually from the ADO UI (Boards → Work Items → find by ID).
