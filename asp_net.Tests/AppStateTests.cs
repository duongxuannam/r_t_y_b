using AspNetTodoApi.Contracts;
using AspNetTodoApi.Models;
using AspNetTodoApi.Services;

namespace AspNetTodoApi.Tests;

public class AppStateTests
{
    [Fact]
    public void CreateTodo_AssignsIncreasingSortOrderPerUser()
    {
        var state = new AppState();
        var userId = Guid.NewGuid();

        var first = state.CreateTodo(userId, new TodoCreateRequest("First", null));
        var second = state.CreateTodo(userId, new TodoCreateRequest("Second", "desc"));

        Assert.Equal(1, first.SortOrder);
        Assert.Equal(2, second.SortOrder);
    }

    [Fact]
    public void ReorderTodos_OnlyUpdatesSpecifiedTodosForUser()
    {
        var state = new AppState();
        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        var todoA = state.CreateTodo(userId, new TodoCreateRequest("A", null));
        var todoB = state.CreateTodo(userId, new TodoCreateRequest("B", null));
        var otherTodo = state.CreateTodo(otherUserId, new TodoCreateRequest("Other", null));

        state.ReorderTodos(userId, [todoB.Id]);

        Assert.Equal(2, todoA.SortOrder);
        Assert.Equal(1, todoB.SortOrder);
        Assert.Equal(1, otherTodo.SortOrder);
    }

    [Fact]
    public void HashPassword_ReturnsStableSha256Hex()
    {
        const string password = "secret123";
        var hash = AppState.HashPassword(password);

        Assert.Equal("FCF730B6D95236ECD3C9FC2D92D7B6B2BB06151496189E2A5967FC017453D3BD", hash);
    }

    [Fact]
    public void IssueToken_AndRevokeToken_UpdatesTokenStore()
    {
        var state = new AppState();
        var userId = Guid.NewGuid();

        var token = state.IssueToken(userId);

        Assert.True(state.Tokens.ContainsKey(token));

        state.RevokeToken(token);

        Assert.False(state.Tokens.ContainsKey(token));
    }
}
