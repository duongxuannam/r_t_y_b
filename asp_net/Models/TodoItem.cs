namespace AspNetTodoApi.Models;

public sealed class TodoItem
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Completed { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public object ToResponse() => new
    {
        id = Id,
        title = Title,
        description = Description,
        completed = Completed,
        sortOrder = SortOrder,
        createdAt = CreatedAt,
        updatedAt = UpdatedAt
    };
}
