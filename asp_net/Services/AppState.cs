using System.Collections.Concurrent;
using AspNetTodoApi.Contracts;
using AspNetTodoApi.Models;

namespace AspNetTodoApi.Services;

public sealed class AppState
{
    public List<User> Users { get; } = [];
    public List<TodoItem> Todos { get; } = [];
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
        var nextOrder = Todos.Where(t => t.UserId == userId)
            .Select(t => t.SortOrder)
            .DefaultIfEmpty(0)
            .Max() + 1;

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
