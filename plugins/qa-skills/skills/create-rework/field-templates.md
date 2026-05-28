# Rework task description template

Use for `System.Description` with `format: "Markdown"`.

```markdown
## Repro steps

{repro steps from user}

## Recording

{video URL, or: None}
```

Fill every section. Do not omit **Repro steps** or **Recording**.

---

# Notification comment (mentions only)

Use for `wit_add_work_item_comment` on the **new rework** after create and parent link.

**Critical:** Plain `@Display Name` in Markdown does **not** notify users. Use **`format: "Html"`** and the `data-vss-mention` markup below (see [Microsoft docs](https://learn.microsoft.com/en-us/azure/devops/organizations/notifications/at-mentions?view=azure-devops)).

**Recipients** (dedupe by `System.AssignedTo.id`): parent PBI assignee + assignee of each earlier rework on that PBI. Skip unassigned. If the set is empty, **do not** post a comment.

**Identity fields** from each `System.AssignedTo`: `id` (GUID) and `displayName`. If `id` is missing, call `core_get_identity_ids` with `uniqueName` or `displayName`.

**Comment body** — only mention anchors, no other text:

```html
<div><a href="#" data-vss-mention="version:2.0,{assignedToId}">@{displayName}</a> <a href="#" data-vss-mention="version:2.0,{assignedToId2}">@{displayName2}</a></div>
```

One `<a …>` per person, space-separated inside a single `<div>`. Use the exact `id` from the identity ref in `data-vss-mention="version:2.0,{id}"`.
