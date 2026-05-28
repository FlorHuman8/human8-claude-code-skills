# cs-unit-tests skill — Design Doc
_2026-05-28_

## Purpose
A reusable skill that writes C# backend unit tests for any C# repo, working from the current git branch diff. It learns test conventions dynamically at runtime rather than hardcoding them.

## Trigger
User asks to write/generate/add unit tests in a C# project context. Always works from the current branch. User can optionally narrow scope to a specific class.

## Core Workflow

1. **Detect diff** — `git diff $(git merge-base HEAD main)...HEAD --name-only`. Falls back to `master` then `develop`.
2. **Filter testable files** — keep `.cs` files with meaningful logic; skip DTOs, interfaces, migrations, config, enums, generated files, and test files themselves.
3. **Sample test patterns** — find test project(s) in the solution; read 2–3 test files closest in namespace to the changed files; discover and read any project-specific test helpers/base classes referenced from those files.
4. **Generate tests** — for each testable changed file: find existing test file → add only tests for new/changed behaviour; or create new test file following sampled patterns.
5. **Report** — list every file created or modified with a one-line summary.

## Filtering Rules

Test: services, managers, handlers, validators, logic classes, controllers, any class with branching logic.
Skip: pure DTOs/models (properties only), interfaces, EF migrations, config/startup/DI, constants, enums, auto-generated files (`*.g.cs`), test files themselves.
Borderline → include (false positive better than false negative).

## Pattern Learning (runtime)

From 2–3 sampled test files extract:
- Test framework attributes (`[TestClass]`/`[TestMethod]` vs `[Test]` etc.)
- Mock declaration and init style
- SUT naming (`_sut`, `Sut`, named after class)
- Test method naming convention
- Async pattern
- Global usings (check `GlobalUsings.cs`)

Then follow imports/base classes to project-specific infrastructure:
- Helper projects (`*.UnitTest.Helper`, etc.)
- Base test classes
- Custom assert extensions
- DbSet / repository mock utilities

Use discovered helpers in generated tests rather than reinventing inline.

## Test Generation Rules

- One test per meaningful code path in changed/new methods
- Don't duplicate tests already in the existing test file
- No tests for unchanged methods
- No tests for trivial pass-through (no branches, no side effects)
- Cover: happy path, guard conditions, key branches, notable side effects
