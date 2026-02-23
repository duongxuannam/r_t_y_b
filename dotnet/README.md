# .NET folder structure (feature-oriented)

Đã tách cấu trúc thư mục .NET theo chức năng thay vì dồn toàn bộ vào một file duy nhất.

## Cấu trúc

```text
dotnet/
  src/
    Api/
      Controllers/
      Middlewares/
      Extensions/
    Application/
      Interfaces/
      Services/
      DTOs/
    Domain/
      Entities/
      Enums/
      Constants/
    Infrastructure/
      Persistence/
        Configurations/
        Repositories/
      ExternalServices/
    Shared/
      Common/
      Exceptions/
  tests/
    UnitTests/
    IntegrationTests/
```

## Mục đích từng tầng

- **Api**: nhận request/response, routing, middleware, cấu hình host.
- **Application**: use-case nghiệp vụ, interface service/repository, DTO.
- **Domain**: entity/value object và luật nghiệp vụ cốt lõi.
- **Infrastructure**: triển khai truy cập DB, cache, message queue, third-party API.
- **Shared**: thành phần dùng chung (result wrapper, constants, exceptions).
- **tests**: tách unit test và integration test rõ ràng.

Bạn có thể đặt các file hiện tại theo mapping:
- `Program.cs`/`Startup.cs` → `src/Api/`
- Controller → `src/Api/Controllers/`
- Business logic → `src/Application/Services/`
- Entity/Enum → `src/Domain/`
- EF Core DbContext/Repository → `src/Infrastructure/Persistence/`
