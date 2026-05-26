# Human8 Claude Code Skills Library

A shared plugin marketplace of Claude Code skills for Dev, PM and QA teams at Human8. Built during our internal hackathon — one install command, immediate value for your daily workflow.

## What's inside

| Plugin | Skills |
|---|---|
| `dev-skills` | Create PR, Cherry-pick to release, Review PR, Create release notes, Investigate bug, Write bug report, Document code |
| `pm-skills` | Draft PBI, Generate acceptance criteria, Split PBI, Refinement prep, Write sprint goal, Stakeholder update |
| `qa-skills` | Write test plan, Write test cases, Regression scope advisor, Write bug report, Automate test case, Test coverage analysis |

## Install

**1. Add the Human8 marketplace to Claude Code (once):**
```
/plugin marketplace add FlorHuman8/human8-claude-code-skills
```

**2. Install the plugin(s) for your role:**
```
/plugin install dev-skills@human8-skills
/plugin install pm-skills@human8-skills
/plugin install qa-skills@human8-skills
```

**3. Restart Claude Code** — your skills are ready to use.

## Usage

Skills are available as slash commands namespaced by plugin, for example:
```
/dev-skills:create-pr
/pm-skills:draft-pbi
/qa-skills:write-test-plan
```

Some skills chain automatically — for example, `create-pr` will invoke `cherry-pick-to-release` after completing the PR description.

## Updating

When new skills are added to the library, run:
```
/plugin marketplace update human8-skills
```

## Repo structure

```
human8-claude-code-skills/
├── .claude-plugin/
│   └── marketplace.json        # Marketplace catalog
└── plugins/
    ├── dev-skills/
    │   ├── .claude-plugin/
    │   │   └── plugin.json     # Plugin manifest
    │   └── skills/
    │       └── skill-name/
    │           └── SKILL.md    # One folder per skill
    ├── pm-skills/
    │   └── ...
    └── qa-skills/
        └── ...
```

## Contributing a new skill

1. Create a folder under the right plugin: `plugins/<team>-skills/skills/<skill-name>/`
2. Add a `SKILL.md` with a frontmatter `description` and the skill instructions
3. Commit and push — teammates can pick it up with `/plugin marketplace update human8-skills`

## About

Built at the Human8 hackathon. Skills are atomic — one skill, one task — and designed to chain together into larger workflows. The library is meant to grow over time as teams discover new use cases.
