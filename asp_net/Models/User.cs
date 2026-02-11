namespace AspNetTodoApi.Models;

public sealed class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }

    public object ToResponse() => new
    {
        id = Id,
        email = Email,
        createdAt = CreatedAt
    };
}
