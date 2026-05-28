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
