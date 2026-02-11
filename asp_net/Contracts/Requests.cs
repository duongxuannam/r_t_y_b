namespace AspNetTodoApi.Contracts;

public record AuthRequest(string Email, string Password);
public record AiGenerateRequest(string Prompt);
public record TodoCreateRequest(string Title, string? Description);
public record TodoUpdateRequest(string? Title, string? Description, bool? Completed);
public record ReorderRequest(List<Guid> OrderedIds);
