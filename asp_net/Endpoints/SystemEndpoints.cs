namespace AspNetTodoApi.Endpoints;

public static class SystemEndpoints
{
    public static void MapSystemEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/health", () => Results.Ok(new { status = "ok" }));
        api.MapGet("/metrics", () => Results.Text("asp_net_metrics 1", "text/plain"));
    }
}
