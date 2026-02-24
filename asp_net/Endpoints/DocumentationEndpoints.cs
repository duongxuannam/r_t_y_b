namespace AspNetTodoApi.Endpoints;

public static class DocumentationEndpoints
{
    public static void MapDocumentationRedirects(this WebApplication app)
    {
        app.MapGet("/api/docs", () => Results.Redirect("/swagger"));
        app.MapGet("/api/docs/scalar", () => Results.Redirect("/swagger"));
        app.MapGet("/api-doc/openapi.json", () => Results.Redirect("/swagger/v1/swagger.json"));
    }
}
