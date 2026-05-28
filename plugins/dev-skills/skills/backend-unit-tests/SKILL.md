---
name: cs-unit-tests
description: |
  Write C# backend unit tests based on the current git branch changes. Use this skill whenever the user asks to write, generate, add, or scaffold unit tests for a C# backend project — especially when working on a feature branch. Trigger on: "write tests for this branch", "add unit tests", "generate tests for my changes", "cover my changes with tests", "write tests for X class", "can you test this?", or any request to improve test coverage in a C# repo. Works on any C# project by learning its test conventions at runtime. Always use this skill instead of guessing C# test patterns.
---

# C# Branch Unit Test Writer

You write unit tests for C# backend changes on the current git branch. You learn the project's test conventions at runtime — never hardcode assumptions about framework, naming, or helpers.

---

## Step 1: Detect changed files

```bash
git diff $(git merge-base HEAD main)...HEAD --name-only
```

If `main` doesn't exist, try `master`, then `develop`. If none exist, fall back to:
```bash
git diff HEAD~1 --name-only
```

Filter the result to `.cs` files only, then apply the testability filter below.

---

## Step 2: Filter to testable files

**Include** files that are likely to contain meaningful logic:
- Services, managers, handlers (MediatR or custom), validators, logic classes, controllers
- Any class with method bodies containing branching, orchestration, or side effects

**Exclude:**
- Files in any path segment containing `Test`, `Spec`, `Migration`
- Pure model/DTO files (only auto-properties, no method bodies)
- Interfaces (`I{Name}.cs` pattern, or files containing only `interface` declarations)
- Config, startup, DI registration, constants, enums
- Auto-generated files (`*.g.cs`, `*.Designer.cs`)

When in doubt, include — a spurious test is less harmful than a missed one.

If the user specified a particular class or file, restrict to that instead of the full diff.

---

## Step 3: Learn the project's test patterns

### 3a. Find the test project(s)

Look for `.csproj` files where the path or name contains `Test`, `Tests`, `UnitTest`, or `Spec`. Confirm by checking for `<IsTestProject>true</IsTestProject>` or test framework package references inside the csproj.

### 3b. Sample 2–3 test files near the changed code

Find test files whose namespace or folder path most closely matches the changed files (same feature area, same layer). Read them fully.

Extract:
- **Framework attributes**: `[TestClass]`/`[TestMethod]`/`[TestInitialize]` (MSTest) vs `[Test]`/`[SetUp]` (NUnit) vs `[Fact]`/`[Theory]` (xUnit)
- **Mock style**: how `Mock<T>` is declared (field per dependency vs inline), where it's initialised (in `[TestInitialize]` / constructor / per-test)
- **SUT naming**: `_sut`, `Sut`, or named after the class (e.g., `_handler`)
- **Test method naming**: e.g. `Method_Scenario_ExpectedOutcome` vs `Should_DoX_When_Y` vs something else
- **Async**: are all tests `async Task`, or mixed?
- **Global usings**: check for `GlobalUsings.cs` in the test project — note what's already imported so you don't repeat it

### 3c. Discover project-specific test infrastructure

Look at the `using` statements and base classes in the sampled test files. For anything that isn't a standard NuGet package, find and read the source:
- Helper projects (e.g., `*.UnitTest.Helper`, `*.TestCommon`)
- Base test classes (e.g., `LogicTestBase`, `CommandApiUnitBase`)
- Custom assert helpers (e.g., `AssertHelper.ThrowsAsync`)
- Mock/data utilities (e.g., `EntityFrameworkExtensions.SetupSet`, `MockDbSet`)

**Use these utilities in your generated tests.** Do not reinvent inline what the project already provides.

---

## Step 4: Analyse each changed file

For each testable file from Step 2:

1. Read the full current source of the file
2. Read the git diff for that file to identify what's **new or changed** — new methods, modified logic, added branches
3. Focus test generation on those changes only

---

## Step 5: Find or create the test file

**Naming convention for test files**: `{ClassName}Test.cs` or `{ClassName}Tests.cs` — match whichever form the project uses.

**Location**: mirror the source folder structure inside the test project. If the source is at `Feature/Payments/PaymentService.cs`, the test file should be at `Feature/Payments/PaymentServiceTest.cs` (or equivalent) inside the test project.

**If the test file already exists:**
- Read it fully
- Identify which methods are already covered
- Only add test methods for behaviour that is **new or changed in the diff** — do not duplicate existing tests

**If the test file does not exist:**
- Create it following the exact structure of the sampled test files
- Include the correct namespace, using statements (respecting global usings), and class declaration
- Use the same `[TestInitialize]` / constructor setup pattern

---

## Step 6: Generate the tests

For each new/changed method in the changed file, write tests covering:
1. **Happy path** — the normal expected flow
2. **Guard conditions** — null inputs, missing entities, invalid state
3. **Key branches** — each meaningful `if`/`else` path, not every permutation
4. **Side effects** — verify calls to dependencies (`Times.Once`, `Times.Never`) where the method is supposed to trigger them

**Rules:**
- Match the naming convention from Step 3b exactly
- Use the SUT name from Step 3b
- Initialise mocks in `[TestInitialize]` / constructor, not inside individual tests
- Use project-specific helpers discovered in Step 3c (mock setup utilities, assert helpers, etc.)
- All async methods → `async Task` tests
- Keep each test focused on one behaviour
- Don't test trivial pass-through code (no branches, no side effects)

---

## Step 7: Report

After writing all files, tell the user:
- Which test files were **created** (new)
- Which test files were **modified** (existing, tests added)
- For each, a one-line summary: how many tests added and what they cover

---

## Common pitfalls to avoid

- **Don't guess helpers** — only use utilities you actually found in Step 3c
- **Don't import what's already in GlobalUsings.cs**
- **Don't test unchanged methods** that already have tests
- **Don't generate tests for the test file itself** if it appears in the diff
- **Don't create a test project** — if none exists, tell the user and stop
