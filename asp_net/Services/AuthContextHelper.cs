using AspNetTodoApi.Models;

namespace AspNetTodoApi.Services;

public static class AuthContextHelper
{
    public static bool TryGetUser(HttpContext httpContext, AppState state, out User user, out string token)
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
}
