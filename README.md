# Human8 Claude Code Skills Library

A shared plugin marketplace of Claude Code skills for Dev, PM and QA teams at Human8. Built during our internal hackathon — one install command, immediate value for your daily workflow.

## What's inside

### Base plugins (all teams)

| Plugin | Skills | Agents |
|---|---|---|
| `dev-skills` | `create-pr`, `review-pr` | `pr-assistant` |
| `pm-skills` | `draft-pbi` | — |
| `qa-skills` | `write-test-plan` | — |

### Team-specific plugins

| Plugin | Team | Skills |
|---|---|---|
| `dev-skills-nara` | Nara / Nolvin | `create-pr`, `review-pr` |
| `dev-skills-communities` | Communities | `create-pr` |
| `dev-skills-surveys` | Surveys | `create-pr` |

Team-specific plugins extend the base skills with team conventions — branching strategy, checklists, repository settings, and platform-specific rules.

## Install

**1. Add the Human8 marketplace to Claude Code (once):**
```
/plugin marketplace add FlorHuman8/human8-claude-code-skills
```

**2. Install the plugins for your role:**

For most developers, install the base plugin plus your team-specific one:
```
/plugin install dev-skills@human8-skills
/plugin install dev-skills-nara@human8-skills      # Nara / Nolvin team
/plugin install dev-skills-communities@human8-skills  # Communities team
/plugin install dev-skills-surveys@human8-skills   # Surveys team
```

For PM and QA roles:
```
/plugin install pm-skills@human8-skills
/plugin install qa-skills@human8-skills
```

**3. Restart Claude Code** — your skills are ready to use.

## Usage

Skills are available as slash commands namespaced by plugin:
```
/dev-skills:create-pr
/dev-skills:review-pr
/pm-skills:draft-pbi
/qa-skills:write-test-plan
```

Team-specific skills override the base with the same command name — use your team plugin's version for full workflow support:
```
/dev-skills-nara:create-pr      # Includes checklist, cherry-pick, Manual Testing task
/dev-skills-nara:review-pr      # Includes backend/frontend checklist validation
```

### Agents

The `pr-assistant` agent orchestrates the full PR workflow automatically — creates the PR then immediately reviews it:
```
/dev-skills:pr-assistant
```

## Repo structure

```
human8-claude-code-skills/
├── .claude-plugin/
│   └── marketplace.json              # Marketplace catalog
└── plugins/
    ├── dev-skills/                   # Base skills (all teams)
    │   ├── .claude-plugin/
    │   │   └── plugin.json
    │   ├── agents/
    │   │   └── pr-assistant.md
    │   └── skills/
    │       ├── create-pr/
    │       │   └── SKILL.md
    │       └── review-pr/
    │           └── SKILL.md
    ├── dev-skills-nara/              # Nara / Nolvin overrides
    │   └── skills/
    │       ├── create-pr/SKILL.md
    │       └── review-pr/SKILL.md
    ├── dev-skills-communities/       # Communities overrides
    │   └── skills/
    │       └── create-pr/SKILL.md
    ├── dev-skills-surveys/           # Surveys overrides
    │   └── skills/
    │       └── create-pr/SKILL.md
    ├── pm-skills/
    │   └── skills/
    │       └── draft-pbi/SKILL.md
    └── qa-skills/
        └── skills/
            └── write-test-plan/SKILL.md
```

## Contributing

### Adding a skill to an existing plugin

1. Create a folder: `plugins/<plugin-name>/skills/<skill-name>/`
2. Add a `SKILL.md` with frontmatter (`name`, `description`) and the skill instructions
3. Commit and push — teammates pick it up with `/plugin marketplace update human8-skills`

### Adding a team-specific override

Team plugins shadow the base skill with the same name. To add or update a team override:

1. Create the skill under the team plugin: `plugins/dev-skills-<team>/skills/<skill-name>/SKILL.md`
2. Build on top of the base skill — keep generic steps, add team-specific conventions
3. Follow the same frontmatter format as the base skill

### Adding an agent

1. Create a `.md` file under `plugins/<plugin-name>/agents/<agent-name>.md`
2. Add frontmatter with `name`, `description`, and `model`
3. Write a system prompt that references the relevant skills

## About

Built at the Human8 hackathon. Skills are atomic — one skill, one task — and designed to chain into larger workflows. Team-specific plugins let each team add their own conventions without forking the shared base. The library grows over time as teams discover new use cases.

## Installation

### Prerequisites

Git must be installed — Claude Code and the plugin marketplace require it. Verify with:

```
git --version
```

---

### Option A — Claude Code Desktop App

**Step 1 — Open the Code section**

In the Claude desktop app, click the **Code** tab in the left sidebar.

![Open the Code section](docs/images/01-code-tab.png)

**Step 2 — Open Customize**

Click **Customize** to open the configuration panel.

![Open Customize](docs/images/02-customize.png)

**Step 3 — Open the plugins menu**

Under **Personal plugins**, click the **+** button to open the plugins menu.

![Open the plugins menu](docs/images/03-plugins-menu.png)

**Step 4 — Create plugin → Add marketplace**

Select **Create plugin**, then choose **Add marketplace**.

![Create plugin → Add marketplace](docs/images/04-create-plugin.png)

**Step 5 — Paste the repository URL and sync**

Paste `https://github.com/FlorHuman8/human8-claude-code-skills` and click **Use...** to sync the marketplace.

> **Note:** If you see "Couldn't load the repository list", that's normal — just type the owner/repo URL directly (`FlorHuman8/human8-claude-code-skills`) and continue.

![Paste the URL and sync](docs/images/05-add-marketplace.png)

**Step 6 — Install plugins**

Install **Core** first (it includes the Azure DevOps MCP server), then install the plugins for your role.

![Install plugins from the directory](docs/images/06-directory.png)

---

### Option B — Claude Code CLI

Run the following commands in order:

```
/plugin marketplace add FlorHuman8/human8-claude-code-skills
```

Install **Core first** — it includes the Azure DevOps connection:

```
/plugin install core@human8-skills
```

Then install the plugins for your role:

```
/plugin install dev-skills@human8-skills
/plugin install dev-skills-surveys@human8-skills      # Surveys team
/plugin install dev-skills-communities@human8-skills  # Communities team
/plugin install dev-skills-nara@human8-skills         # Nara / Nolvin team
/plugin install pm-skills@human8-skills               # PMs
/plugin install qa-skills@human8-skills               # QA
```

Reload to activate:

```
/reload-plugins
```

---

### Using skills in Claude chat (no CLI required)

Once installed, skills are also available in the general Claude chat — PMs and others can use them without the CLI by typing the skill name or describing the task in natural language.

---

### Troubleshooting

- **"Couldn't load the repository list"** — This is normal. Just type the owner/repo URL (`FlorHuman8/human8-claude-code-skills`) directly instead of browsing the list.
- **Skills don't appear in the `/` menu** — Skills may not always show as autocomplete suggestions, but they still work when typed in full (e.g. `/pm-skills:draft-pbi`) or described in natural language.
