using AspNetTodoApi.Services;
using Microsoft.AspNetCore.Http;

namespace AspNetTodoApi.Tests;

public class AuthContextHelperTests
{
    [Fact]
    public void TryGetUser_ReturnsTrueWhenAuthorizationHeaderAndTokenAreValid()
    {
        var state = new AppState();
        var user = state.CreateUser("user@example.com", "pass");
        var token = state.IssueToken(user.Id);
        var context = new DefaultHttpContext();
        context.Request.Headers.Authorization = $"Bearer {token}";

        var result = AuthContextHelper.TryGetUser(context, state, out var foundUser, out var foundToken);

        Assert.True(result);
        Assert.Equal(user.Id, foundUser.Id);
        Assert.Equal(token, foundToken);
    }

    [Fact]
    public void TryGetUser_ReturnsFalseWhenHeaderIsMissingOrMalformed()
    {
        var state = new AppState();
        var context = new DefaultHttpContext();

        var missingHeaderResult = AuthContextHelper.TryGetUser(context, state, out _, out _);

        Assert.False(missingHeaderResult);

        context.Request.Headers.Authorization = "Basic abc123";

        var malformedHeaderResult = AuthContextHelper.TryGetUser(context, state, out _, out _);

        Assert.False(malformedHeaderResult);
    }
}
