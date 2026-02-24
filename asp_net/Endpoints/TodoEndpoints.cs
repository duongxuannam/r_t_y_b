using AspNetTodoApi.Contracts;
using AspNetTodoApi.Services;

namespace AspNetTodoApi.Endpoints;

public static class TodoEndpoints
{
    public static void MapTodoEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/todos", (HttpContext httpContext, AppState state) =>
        {
            if (!AuthContextHelper.TryGetUser(httpContext, state, out var user, out _))
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
            if (!AuthContextHelper.TryGetUser(httpContext, state, out var user, out _))
            {
                return Results.Unauthorized();
            }

            var todo = state.CreateTodo(user.Id, request);
            return Results.Ok(todo.ToResponse());
        });

        api.MapPut("/todos/reorder-items", (HttpContext httpContext, ReorderRequest request, AppState state) =>
        {
            if (!AuthContextHelper.TryGetUser(httpContext, state, out var user, out _))
            {
                return Results.Unauthorized();
            }

            state.ReorderTodos(user.Id, request.OrderedIds);
            return Results.Ok(new { message = "Reordered." });
        });

        api.MapGet("/todos/{id:guid}", (HttpContext httpContext, Guid id, AppState state) =>
        {
            if (!AuthContextHelper.TryGetUser(httpContext, state, out var user, out _))
            {
                return Results.Unauthorized();
            }

            var todo = state.Todos.FirstOrDefault(t => t.Id == id && t.UserId == user.Id);
            return todo is null ? Results.NotFound() : Results.Ok(todo.ToResponse());
        });

        api.MapPut("/todos/{id:guid}", (HttpContext httpContext, Guid id, TodoUpdateRequest request, AppState state) =>
        {
            if (!AuthContextHelper.TryGetUser(httpContext, state, out var user, out _))
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
            if (!AuthContextHelper.TryGetUser(httpContext, state, out var user, out _))
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
    }
}
