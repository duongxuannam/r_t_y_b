using AspNetTodoApi.Services;

namespace AspNetTodoApi.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/users", (HttpContext httpContext, AppState state) =>
        {
            if (!AuthContextHelper.TryGetUser(httpContext, state, out _, out _))
            {
                return Results.Unauthorized();
            }

            var users = state.Users.Select(u => u.ToResponse()).ToList();
            return Results.Ok(new { items = users });
        });
    }
}
