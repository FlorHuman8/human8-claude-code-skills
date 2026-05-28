---
name: nolvin-unit-tests
description: |
  Write backend unit tests for the Nolvin C# codebase. Use this skill whenever the user asks to write, add, generate, or scaffold unit tests for any controller, service, handler, or validator in the Nolvin solution (repo at source/repos/Nolvin). Trigger on phrases like "write tests for", "add unit tests", "test this class", "generate tests", "cover this with tests", "create a test file", or any request to improve test coverage on a Nolvin class. Also trigger when pasting Nolvin C# code and asking "can you test this?" or similar.
---

# Nolvin Unit Test Writer

You are writing unit tests for the **Nolvin** C# backend — an ASP.NET Core API targeting .NET 8, located at `source/repos/Nolvin/app/backend/NET.Api`. Tests live in `source/repos/Nolvin/app/tests/Nolvin.Api.Tests`.

---

## Stack

| Concern | Library |
|---------|---------|
| Test framework | xUnit v2 (`[Fact]`, `[Theory]`) |
| Assertions | FluentAssertions |
| Mocking | Moq v4 |
| Database | EF Core InMemory (`UseInMemoryDatabase`) — not mocked DbSet |
| Auth | `ClaimsPrincipal` with Azure AD claims |

### Required packages (add to `Nolvin.Api.Tests.csproj` if missing)

```xml
<PackageReference Include="FluentAssertions" Version="6.*" />
<PackageReference Include="Moq" Version="4.*" />
<PackageReference Include="Microsoft.EntityFrameworkCore.InMemory" Version="8.*" />
<PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.*" />
```

Also add project references if missing:
```xml
<ProjectReference Include="..\..\backend\NET.Api\Nolvin.Api.csproj" />
```

---

## Anatomy of a Test Class

```csharp
namespace Nolvin.Api.Tests.{Layer}  // e.g. Controllers, Services
{
    public class {ClassName}Tests   // plural "Tests", no [TestClass]
    {
        // 1. Mocks — one field per interface dependency
        private readonly Mock<I{Dependency}> _mock{Dependency};
        private readonly Mock<ILogger<{ClassName}>> _mockLogger;

        // 2. Real InMemory DbContext (not mocked)
        private readonly ApplicationDbContext _dbContext;

        // 3. System under test
        private readonly {ClassName} _{sut};  // e.g. _controller, _service

        // 4. Fixed test identity constants
        private readonly int _testUserId = 1;
        private readonly string _testUserAzureAdObjectId = "00000000-0000-0000-0000-000000000000";

        public {ClassName}Tests()   // all setup in constructor, no [TestInitialize]
        {
            _mock{Dependency} = new Mock<I{Dependency}>();
            _mockLogger = new Mock<ILogger<{ClassName}>>();

            // Fresh InMemory DB per test class — unique name avoids cross-test pollution
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _dbContext = new ApplicationDbContext(options);

            // Seed the test user
            _dbContext.Users.Add(new User
            {
                Id = _testUserId,
                AdObjectId = Guid.Parse(_testUserAzureAdObjectId),
                Email = "testuser@example.com",
                FirstName = "Test",
                LastName = "User",
            });
            _dbContext.SaveChanges();

            // Build the ClaimsPrincipal for the test user
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, _testUserId.ToString()),
                new Claim("http://schemas.microsoft.com/identity/claims/objectidentifier",
                          _testUserAzureAdObjectId),
            }, "TestAuthentication"));

            // For controllers: set ControllerContext with the user
            _controller = new {ClassName}(
                _mock{Dependency}.Object,
                _mockLogger.Object,
                _dbContext)
            {
                ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = user }
                }
            };
        }
    }
}
```

---

## Test Method Naming

Format: `MethodName_WhenCondition_ReturnsResult`

**Examples:**
```
GetNotifications_WhenCalled_ReturnsOkWithCombinedNotifications
GetNotifications_WhenServiceThrowsUnauthorized_ReturnsUnauthorized
MarkAsReadAsync_WhenNotificationNotFound_ReturnsNotFound
CreateProject_WhenValidRequest_ReturnsCreatedResult
```

---

## Test Data Factory Methods

For complex entities used across multiple tests, add a private factory method rather than duplicating object initializers:

```csharp
private NotificationDto CreateTestNotificationDto(
    Guid id,
    bool isGlobal = false,
    int? userId = null,
    bool isRead = false)
{
    return new NotificationDto
    {
        Id = id,
        Title = "Test Title",
        Message = "Test Message",
        IsGlobal = isGlobal,
        UserId = userId ?? (isGlobal ? null : _testUserId),
        CreatedAt = DateTime.UtcNow,
        IsRead = isRead,
    };
}
```

---

## Controller Test Patterns

### Happy path
```csharp
[Fact]
public async Task GetItems_WhenCalled_ReturnsOkWithItems()
{
    // Arrange
    var items = new List<ItemDto> { /* ... */ };
    _mockService.Setup(s => s.GetItemsAsync(_testUserId)).ReturnsAsync(items);

    // Act
    var result = await _controller.GetItems();

    // Assert
    var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
    okResult.Value.Should().BeAssignableTo<IEnumerable<ItemDto>>()
        .Which.Should().HaveCount(items.Count);
}
```

### Unauthorized — user not found in DB (Nolvin pattern)
Create a fresh controller instance with an **empty** DB and a **different** Azure AD Object ID:

```csharp
[Fact]
public async Task GetItems_WhenUserNotInDatabase_ReturnsUnauthorized()
{
    // Arrange
    var emptyOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
        .Options;
    var emptyDbContext = new ApplicationDbContext(emptyOptions);

    var unknownUser = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
    {
        new Claim("http://schemas.microsoft.com/identity/claims/objectidentifier",
                  Guid.NewGuid().ToString()),  // different GUID — not in DB
    }, "TestAuthentication"));

    var controllerWithEmptyDb = new {ClassName}(
        _mockService.Object,
        _mockLogger.Object,
        emptyDbContext)
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = unknownUser }
        }
    };

    // Act
    var result = await controllerWithEmptyDb.GetItems();

    // Assert
    result.Should().BeOfType<UnauthorizedObjectResult>();
}
```

### NotFoundException → 404
```csharp
[Fact]
public async Task GetItem_WhenNotFound_ReturnsNotFound()
{
    _mockService.Setup(s => s.GetItemAsync(_testItemId, _testUserId))
        .ThrowsAsync(new NotFoundException("Not found"));

    var result = await _controller.GetItem(_testItemId);

    result.Should().BeOfType<NotFoundObjectResult>();
}
```

### UnauthorizedAccessException → 401
```csharp
[Fact]
public async Task UpdateItem_WhenUnauthorized_ReturnsUnauthorized()
{
    _mockService.Setup(s => s.UpdateAsync(_testItemId, It.IsAny<UpdateRequest>(), _testUserId))
        .ThrowsAsync(new UnauthorizedAccessException("Unauthorized"));

    var result = await _controller.UpdateItem(_testItemId, new UpdateRequest());

    result.Should().BeOfType<UnauthorizedObjectResult>();
}
```

### Generic Exception → 500
```csharp
[Fact]
public async Task GetItems_WhenServiceThrowsException_ReturnsInternalServerError()
{
    _mockService.Setup(s => s.GetItemsAsync(_testUserId))
        .ThrowsAsync(new Exception("Unexpected error"));

    var result = await _controller.GetItems();

    var statusCodeResult = result.Should().BeOfType<ObjectResult>().Subject;
    statusCodeResult.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);
}
```

### Successful write operations → 204 No Content
```csharp
[Fact]
public async Task DeleteItem_WhenSuccessful_ReturnsNoContent()
{
    _mockService.Setup(s => s.DeleteAsync(_testItemId, _testUserId))
        .Returns(Task.CompletedTask);

    var result = await _controller.DeleteItem(_testItemId);

    result.Should().BeOfType<NoContentResult>();
}
```

---

## Coverage Checklist Per Endpoint

For each controller action, cover in this order:

1. **Happy path** — successful response with correct data shape
2. **User not in DB** — unauthorized (create controller with empty DB + unknown Azure AD OID)
3. **NotFoundException** from service → 404
4. **UnauthorizedAccessException** from service → 401
5. **Generic Exception** → 500

Not every endpoint needs all five — skip what can't realistically happen for that action.

---

## Service Test Patterns

Services don't have auth concerns — no need for `ClaimsPrincipal`. Mock only the dependencies injected via constructor.

```csharp
public class {ServiceName}Tests
{
    private readonly Mock<I{Repository}> _mock{Repository};
    private readonly ApplicationDbContext _dbContext;
    private readonly {ServiceName} _service;

    public {ServiceName}Tests()
    {
        _mock{Repository} = new Mock<I{Repository}>();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _dbContext = new ApplicationDbContext(options);

        _service = new {ServiceName}(_mock{Repository}.Object, _dbContext);
    }

    [Fact]
    public async Task MethodName_WhenCondition_ReturnsExpected()
    {
        // Arrange
        // Act
        // Assert — use FluentAssertions
    }
}
```

---

## File placement

- Test file location: `tests/Nolvin.Api.Tests/{Layer}/{ClassName}Tests.cs`
  - e.g. `tests/Nolvin.Api.Tests/Controllers/ProjectControllerTests.cs`
  - e.g. `tests/Nolvin.Api.Tests/Services/ChatServiceTests.cs`
- Namespace mirrors location: `Nolvin.Api.Tests.{Layer}`

---

## Global usings already in `NET.Api`

The following are globally imported in the API project and available without explicit `using` in test files that reference the API project:
`Microsoft.AspNetCore.Mvc`, `Nolvin.Api.Services`, `Nolvin.Shared.Models`, `Nolvin.Database.Data`

You still need explicit usings for test-specific imports: `Moq`, `FluentAssertions`, `Microsoft.EntityFrameworkCore`, `System.Security.Claims`, `Xunit`.
