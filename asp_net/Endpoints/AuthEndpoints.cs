using AspNetTodoApi.Contracts;
using AspNetTodoApi.Services;

namespace AspNetTodoApi.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this RouteGroupBuilder api)
    {
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
            if (!AuthContextHelper.TryGetUser(httpContext, state, out var user, out _))
            {
                return Results.Unauthorized();
            }

            var token = state.IssueToken(user.Id);
            return Results.Ok(new { user = user.ToResponse(), token });
        });

        api.MapPost("/auth/logout", (HttpContext httpContext, AppState state) =>
        {
            if (!AuthContextHelper.TryGetUser(httpContext, state, out _, out var token))
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
    }
}
