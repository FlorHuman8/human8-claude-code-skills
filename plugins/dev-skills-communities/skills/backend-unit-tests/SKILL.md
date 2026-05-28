---
name: insites-unit-tests
description: |
  Write backend unit tests for the InSites Eco C# codebase. Use this skill whenever the user asks to write, add, generate, or scaffold unit tests for any class, service, validator, handler, or controller in the InSites Eco solution. Trigger on phrases like "write tests for", "add unit tests", "test this class", "generate tests", "cover this with tests", "create a test file", or any request to improve test coverage on an InSites Eco class. Also trigger when pasting C# code and asking "can you test this?" or similar.
---

# InSites Eco Unit Test Writer

You are writing unit tests for the **InSites Eco** C# backend — a CQRS + layered monolith targeting .NET 8. The test conventions below are non-negotiable: every test you write must match what already exists in the repo.

## Stack at a Glance

| Concern | Library |
|---------|---------|
| Test framework | MSTest v4 (`Microsoft.VisualStudio.TestTools.UnitTesting`) |
| Mocking | Moq v4 |
| Validation testing | FluentValidation.TestHelper |
| DbSet mocking | `EntityFrameworkExtensions` (in `InSites.Eco.Service.Common.UnitTest.Helper`) + MockQueryable.Moq |
| Exception assertions | `AssertHelper.ThrowsAsync` (same helper project) |
| DI container | Autofac (not needed in unit tests — use constructor injection directly) |

---

## Anatomy of a Test Class

Every test class must follow this exact structure:

```csharp
// Global usings already declared in GlobalUsings.cs:
// global using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public class {ClassName}Test
{
    // 1. Mocks — one field per dependency
    private Mock<I{Dependency}> _{dependencyMock};

    // 2. System Under Test
    private {ClassName} _sut;

    // 3. Shared test data fields (entities, IDs, etc.)
    private static readonly Guid _someEntityId = Guid.NewGuid();

    [TestInitialize]
    public void TestSetup()
    {
        // Initialize mocks
        _{dependencyMock} = new Mock<I{Dependency}>();

        // Wire up default behavior here (not inside each test)

        // Create sut last, after all mocks are ready
        _sut = new {ClassName}(_{dependencyMock}.Object, ...);
    }

    [TestMethod]
    public async Task {ClassName}_{Scenario}_{ExpectedOutcome}()
    {
        // Arrange
        // Act
        // Assert
    }
}
```

---

## Test Naming Convention

Format: `{ClassName}_{Scenario}_{ExpectedOutcome}`

- Use underscores to separate the three segments
- Write full English words — no abbreviations
- The scenario describes the situation; the outcome describes what should happen

**Examples:**
```
ActivitySequenceManagement_Calling_AddOrUpdateSequence_Create_New_Sequence
ChangePasswordValidator_When_Password_Is_Too_Short_Should_Have_Validation_Error
FeatureHandler_When_Feature_Is_Enabled_Should_Call_Update_Once
ParticipantManagement_When_Email_Already_Exists_Should_Throw_ConflictException
```

---

## Mocking Dependencies

### Standard service/interface mock
```csharp
var _featureManagementMock = new Mock<IFeatureManagement>();
_featureManagementMock
    .Setup(x => x.GetFeatureSettingAsync(It.IsAny<Guid>(), FeatureKey.SomeKey))
    .ReturnsAsync(new FeatureSetting { Value = "true" });
```

### Verifying calls
```csharp
_featureManagementMock.Verify(
    x => x.UpdateFeatureSettingAsync(It.IsAny<FeatureSetting>()),
    Times.Once);
```

### Mocking a DbContext with DbSet<T>
Use `EntityFrameworkExtensions.SetupSet` from the helper project:

```csharp
var _contextMock = new Mock<IActivityManagementCommandContext>();

// Prepare in-memory data list — keep a reference so you can assert against it
var activities = new List<Activity>
{
    new() { Id = _activityId, SquareId = _squareId, Status = ActivityStatus.Active }
};

// Wire up the mock DbSet (handles async LINQ via MockQueryable)
_contextMock.SetupSet(ctx => ctx.Activities, activities);

// Add/Remove callbacks are wired automatically — new entities get IDs assigned
```

When you need to assert something was added:
```csharp
// After Act: the item was added to the list reference
Assert.AreEqual(2, activities.Count);
Assert.IsNotNull(activities.FirstOrDefault(a => a.Name == "New Activity"));
```

---

## Validator Tests

Use FluentValidation's test helper — do NOT call the validator through the service:

```csharp
[TestClass]
public class ChangePasswordValidatorTest
{
    private Mock<IParticipantManagementCommandContext> _contextMock;
    private ChangePasswordValidator _sut;

    [TestInitialize]
    public void TestSetup()
    {
        _contextMock = new Mock<IParticipantManagementCommandContext>();

        // Seed data the validator queries
        var participants = new List<Participant> { /* ... */ };
        _contextMock.SetupSet(ctx => ctx.Participants, participants);

        _sut = new ChangePasswordValidator(_contextMock.Object);
    }

    [TestMethod]
    public async Task ChangePasswordValidator_When_Password_Is_Too_Short_Should_Have_Error()
    {
        var request = new ChangePasswordRequest { NewPassword = "abc" };
        var result = await _sut.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(r => r.NewPassword);
    }

    [TestMethod]
    public async Task ChangePasswordValidator_When_Request_Is_Valid_Should_Not_Have_Error()
    {
        var request = new ChangePasswordRequest { NewPassword = "ValidPass123!" };
        var result = await _sut.TestValidateAsync(request);
        result.ShouldNotHaveValidationErrorFor(r => r.NewPassword);
    }
}
```

---

## Async Tests

All service operations are async — tests must be too:

```csharp
[TestMethod]
public async Task ActivityManagement_When_Activity_Exists_Should_Return_It()
{
    // All tests use async Task — never void
    var result = await _sut.GetActivityAsync(_activityId);
    Assert.IsNotNull(result);
}
```

---

## Exception Testing

Use `AssertHelper.ThrowsAsync` from the helper project:

```csharp
[TestMethod]
public async Task ParticipantManagement_When_Email_Duplicate_Should_Throw()
{
    await AssertHelper.ThrowsAsync(
        typeof(ConflictException),
        () => _sut.CreateParticipantAsync(requestWithDuplicateEmail));
}
```

---

## Base Test Classes (when to use them)

Create a base class when **3 or more** test classes in the same project share the same mock setup or data. Otherwise, keep setup inline in the test class.

```csharp
public class ActivityLogicTestBase
{
    protected Mock<IActivityManagementCommandContext> Context;
    protected Mock<IEventService> EventService;
    protected List<Activity> ActivitiesInContext;

    [TestInitialize]
    public virtual void TestSetup()
    {
        Context = new Mock<IActivityManagementCommandContext>();
        EventService = new Mock<IEventService>();
        ActivitiesInContext = new List<Activity>
        {
            new() { Id = Guid.NewGuid(), Status = ActivityStatus.Active }
        };
        Context.SetupSet(ctx => ctx.Activities, ActivitiesInContext);
    }
}
```

---

## Where to Put Test Files

| Class being tested | Test project |
|--------------------|--------------|
| `*Logic/*.cs` | `*Logic.UnitTest/` |
| `*Api/Controllers/*.cs` | `*Api.UnitTest/` |
| `*Data/*.cs` | `*Data.UnitTest/` |
| `*Logic/Validation/*.cs` | Same `*Logic.UnitTest/` as the logic |

Test file name: `{ClassName}Test.cs`

---

## What to Test (Coverage Priorities)

For each class, cover in this order:

1. **Happy path** — the normal, expected flow
2. **Guard conditions** — null inputs, missing entities, unauthorized access
3. **Business rule violations** — invalid state transitions, constraint failures
4. **Side effects** — verify events are published, cache is cleared, emails are sent
5. **Validator rules** — one test per FluentValidation rule (both valid and invalid cases)

Don't test:
- Auto-implemented properties with no logic
- EF migrations or database schema
- Third-party library behavior (Moq, AutoMapper, etc.)

---

## Checklist Before Finishing

- [ ] `[TestClass]` on class, `[TestMethod]` on each test
- [ ] `[TestInitialize]` initializes all mocks and creates `_sut` last
- [ ] Test names follow `{Class}_{Scenario}_{Outcome}` with underscores
- [ ] All tests are `async Task` (never `async void` or synchronous for IO operations)
- [ ] Mock data is set up with `SetupSet` for DbSet properties
- [ ] Verifications use `Times.Once` / `Times.Never` / `Times.Exactly(n)` as appropriate
- [ ] Exception cases use `AssertHelper.ThrowsAsync`
- [ ] Validator tests use `TestValidateAsync` + FluentValidation assertion extensions
- [ ] File is placed in the correct `*.UnitTest` project
