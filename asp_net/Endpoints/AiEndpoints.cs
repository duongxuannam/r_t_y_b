using AspNetTodoApi.Contracts;

namespace AspNetTodoApi.Endpoints;

public static class AiEndpoints
{
    public static void MapAiEndpoints(this RouteGroupBuilder api)
    {
        api.MapPost("/ai/generate", (AiGenerateRequest request) =>
            Results.Ok(new
            {
                response = $"Echo: {request.Prompt}",
                model = "asp-net-stub"
            }));
    }
}
