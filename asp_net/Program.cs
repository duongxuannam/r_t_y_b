using System.Collections.Concurrent;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<AppState>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

var api = app.MapGroup("/api");

api.MapGet("/health", () => Results.Ok(new { status = "ok" }));
api.MapGet("/metrics", () => Results.Text("asp_net_metrics 1", "text/plain"));

api.MapPost("/ai/generate", (AiGenerateRequest request) =>
    Results.Ok(new
    {
        response = $"Echo: {request.Prompt}",
        model = "asp-net-stub"
    }));

api.MapPost("/auth/register", (AuthRequest request, AppState state) =>
{
    if (state.Users.Any(u => u.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase)))
    {
        return Results.BadRequest(new { message = "Email already registered." });
    }

    var user = state.CreateUser(request.Email, request.Password);
    var token = state.IssueToken(user.Id);

    return Results.Ok(new { user = user.ToResponse(), token });
});

api.MapPost("/auth/login", (AuthRequest request, AppState state) =>
{
    var user = state.Users.FirstOrDefault(u =>
        u.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase));

    if (user is null || user.PasswordHash != AppState.HashPassword(request.Password))
    {
        return Results.Unauthorized();
    }

    var token = state.IssueToken(user.Id);
    return Results.Ok(new { user = user.ToResponse(), token });
});

api.MapPost("/auth/refresh", (HttpContext httpContext, AppState state) =>
{
    if (!TryGetUser(httpContext, state, out var user, out _))
    {
        return Results.Unauthorized();
    }

    var token = state.IssueToken(user.Id);
    return Results.Ok(new { user = user.ToResponse(), token });
});

api.MapPost("/auth/logout", (HttpContext httpContext, AppState state) =>
{
    if (!TryGetUser(httpContext, state, out _, out var token))
    {
        return Results.Unauthorized();
    }

    state.RevokeToken(token);
    return Results.Ok(new { message = "Logged out." });
});

api.MapPost("/auth/forgot", () =>
    Results.Ok(new { message = "If the account exists, a reset link has been sent." }));

api.MapPost("/auth/reset", () =>
    Results.Ok(new { message = "Password reset completed." }));

api.MapGet("/todos", (HttpContext httpContext, AppState state) =>
{
    if (!TryGetUser(httpContext, state, out var user, out _))
    {
        return Results.Unauthorized();
    }

    var todos = state.Todos.Where(t => t.UserId == user.Id)
        .OrderBy(t => t.SortOrder)
        .Select(t => t.ToResponse())
        .ToList();

    return Results.Ok(new { items = todos });
});

api.MapPost("/todos", (HttpContext httpContext, TodoCreateRequest request, AppState state) =>
{
    if (!TryGetUser(httpContext, state, out var user, out _))
    {
        return Results.Unauthorized();
    }

    var todo = state.CreateTodo(user.Id, request);
    return Results.Ok(todo.ToResponse());
});

api.MapPut("/todos/reorder-items", (HttpContext httpContext, ReorderRequest request, AppState state) =>
{
    if (!TryGetUser(httpContext, state, out var user, out _))
    {
        return Results.Unauthorized();
    }

    state.ReorderTodos(user.Id, request.OrderedIds);
    return Results.Ok(new { message = "Reordered." });
});

api.MapGet("/todos/{id:guid}", (HttpContext httpContext, Guid id, AppState state) =>
{
    if (!TryGetUser(httpContext, state, out var user, out _))
    {
        return Results.Unauthorized();
    }

    var todo = state.Todos.FirstOrDefault(t => t.Id == id && t.UserId == user.Id);
    return todo is null ? Results.NotFound() : Results.Ok(todo.ToResponse());
});

api.MapPut("/todos/{id:guid}", (HttpContext httpContext, Guid id, TodoUpdateRequest request, AppState state) =>
{
    if (!TryGetUser(httpContext, state, out var user, out _))
    {
        return Results.Unauthorized();
    }

    var todo = state.Todos.FirstOrDefault(t => t.Id == id && t.UserId == user.Id);
    if (todo is null)
    {
        return Results.NotFound();
    }

    todo.Title = request.Title ?? todo.Title;
    todo.Description = request.Description ?? todo.Description;
    todo.Completed = request.Completed ?? todo.Completed;
    todo.UpdatedAt = DateTimeOffset.UtcNow;

    return Results.Ok(todo.ToResponse());
});

api.MapDelete("/todos/{id:guid}", (HttpContext httpContext, Guid id, AppState state) =>
{
    if (!TryGetUser(httpContext, state, out var user, out _))
    {
        return Results.Unauthorized();
    }

    var todo = state.Todos.FirstOrDefault(t => t.Id == id && t.UserId == user.Id);
    if (todo is null)
    {
        return Results.NotFound();
    }

    state.Todos.Remove(todo);
    return Results.Ok(new { message = "Deleted." });
});

api.MapGet("/users", (HttpContext httpContext, AppState state) =>
{
    if (!TryGetUser(httpContext, state, out _, out _))
    {
        return Results.Unauthorized();
    }

    var users = state.Users.Select(u => u.ToResponse()).ToList();
    return Results.Ok(new { items = users });
});

app.MapGet("/api/docs", () => Results.Redirect("/swagger"));
app.MapGet("/api/docs/scalar", () => Results.Redirect("/swagger"));
app.MapGet("/api-doc/openapi.json", () => Results.Redirect("/swagger/v1/swagger.json"));

app.Run();

static bool TryGetUser(HttpContext httpContext, AppState state, out User user, out string token)
{
    user = default!;
    token = string.Empty;

    if (!httpContext.Request.Headers.TryGetValue("Authorization", out var value))
    {
        return false;
    }

    var header = value.ToString();
    if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
    {
        return false;
    }

    token = header["Bearer ".Length..].Trim();
    if (string.IsNullOrWhiteSpace(token))
    {
        return false;
    }

    if (!state.Tokens.TryGetValue(token, out var userId))
    {
        return false;
    }

    var found = state.Users.FirstOrDefault(u => u.Id == userId);
    if (found is null)
    {
        return false;
    }

    user = found;
    return true;
}

record AuthRequest(string Email, string Password);
record AiGenerateRequest(string Prompt);
record TodoCreateRequest(string Title, string? Description);
record TodoUpdateRequest(string? Title, string? Description, bool? Completed);
record ReorderRequest(List<Guid> OrderedIds);

sealed class AppState
{
    public List<User> Users { get; } = new();
    public List<TodoItem> Todos { get; } = new();
    public ConcurrentDictionary<string, Guid> Tokens { get; } = new();

    public User CreateUser(string email, string password)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = HashPassword(password),
            CreatedAt = DateTimeOffset.UtcNow
        };

        Users.Add(user);
        return user;
    }

    public TodoItem CreateTodo(Guid userId, TodoCreateRequest request)
    {
        var nextOrder = Todos.Where(t => t.UserId == userId).Select(t => t.SortOrder).DefaultIfEmpty(0).Max() + 1;

        var todo = new TodoItem
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = request.Title,
            Description = request.Description,
            Completed = false,
            SortOrder = nextOrder,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        Todos.Add(todo);
        return todo;
    }

    public void ReorderTodos(Guid userId, List<Guid> orderedIds)
    {
        var orderLookup = orderedIds.Select((id, index) => (id, index))
            .ToDictionary(x => x.id, x => x.index + 1);

        foreach (var todo in Todos.Where(t => t.UserId == userId))
        {
            if (orderLookup.TryGetValue(todo.Id, out var order))
            {
                todo.SortOrder = order;
            }
        }
    }

    public string IssueToken(Guid userId)
    {
        var token = Convert.ToHexString(Guid.NewGuid().ToByteArray());
        Tokens[token] = userId;
        return token;
    }

    public void RevokeToken(string token)
    {
        Tokens.TryRemove(token, out _);
    }

    public static string HashPassword(string password)
    {
        return Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(password)));
    }
}

sealed class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }

    public object ToResponse() => new
    {
        id = Id,
        email = Email,
        createdAt = CreatedAt
    };
}

sealed class TodoItem
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Completed { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public object ToResponse() => new
    {
        id = Id,
        title = Title,
        description = Description,
        completed = Completed,
        sortOrder = SortOrder,
        createdAt = CreatedAt,
        updatedAt = UpdatedAt
    };
}
