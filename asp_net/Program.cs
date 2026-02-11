using AspNetTodoApi.Endpoints;
using AspNetTodoApi.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<AppState>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

var api = app.MapGroup("/api");
api.MapSystemEndpoints();
api.MapAiEndpoints();
api.MapAuthEndpoints();
api.MapTodoEndpoints();
api.MapUserEndpoints();

app.MapDocumentationRedirects();

app.Run();
