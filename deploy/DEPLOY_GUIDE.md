# Tài liệu triển khai VPS, backup dữ liệu, và rollback phiên bản

Tài liệu này hướng dẫn triển khai hệ thống lên VPS bằng Docker Compose, thiết lập backup dữ liệu, và cách rollback (revert) phiên bản khi cần.

## 1) Kiến trúc triển khai

- **Back-end**: Rust Axum API.
- **Database**: PostgreSQL.
- **Front-end**: React (nếu triển khai cùng VPS, thường đặt sau reverse proxy).
- **Triển khai**: Docker Compose dùng image từ GHCR (GitHub Container Registry).

File Compose mẫu cho VPS: `deploy/docker-compose.vps.yml`.

## 2) Chuẩn bị VPS

### 2.1 Cài đặt Docker + Compose

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

### 2.2 Tạo thư mục ứng dụng

```bash
sudo mkdir -p /opt/todo-api
sudo chown -R $USER:$USER /opt/todo-api
```

### 2.3 Copy cấu hình triển khai

```bash
cp deploy/docker-compose.vps.yml /opt/todo-api/docker-compose.yml
cp back-end/.env.example /opt/todo-api/.env
```

Cập nhật `/opt/todo-api/.env`:
- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- SMTP (nếu bật tính năng email)
- Các cấu hình khác tuỳ theo môi trường.

## 3) Triển khai phiên bản mới

### 3.1 Pull image và start

Giả sử image được build và push lên GHCR với tag là commit SHA, bạn chỉ cần set `IMAGE_REF` trong `.env` rồi chạy compose:

```bash
cd /opt/todo-api
export IMAGE_REF=ghcr.io/<org>/<repo>:<commit-sha>
# ghi vào .env để ghi nhớ phiên bản đang chạy
if grep -q '^IMAGE_REF=' .env; then
  sed -i "s#^IMAGE_REF=.*#IMAGE_REF=${IMAGE_REF}#" .env
else
  echo "IMAGE_REF=${IMAGE_REF}" >> .env
fi

docker compose pull

docker compose up -d
```

### 3.2 Kiểm tra dịch vụ

```bash
docker compose ps
curl -f http://127.0.0.1:3000/healthz
```

> Nếu dự án có reverse proxy (Nginx/Traefik), hãy kiểm tra thêm đường dẫn public.

## 4) Backup dữ liệu

### 4.1 Backup PostgreSQL bằng `pg_dump`

**Khuyến nghị** lưu backup ra thư mục riêng, ví dụ `/opt/todo-api/backups`.

```bash
mkdir -p /opt/todo-api/backups
```

Chạy lệnh backup:

```bash
docker compose exec -T db pg_dump -U <db_user> -d <db_name> \
  | gzip > /opt/todo-api/backups/todo_api_$(date +%F_%H%M%S).sql.gz
```

> Đảm bảo thông tin user/db trùng với cấu hình trong `DATABASE_URL`.

### 4.2 Backup volume (tuỳ chọn)

Nếu bạn lưu thêm dữ liệu vào volume, có thể backup bằng `tar`:

```bash
docker run --rm \
  -v todo-api_db-data:/data \
  -v /opt/todo-api/backups:/backup \
  alpine \
  sh -c "cd /data && tar czf /backup/db-data_$(date +%F_%H%M%S).tar.gz ."
```

### 4.3 Lập lịch backup tự động (cron)

Ví dụ backup mỗi ngày lúc 2 giờ sáng:

```bash
crontab -e
```

Thêm dòng:

```cron
0 2 * * * /bin/bash -lc 'cd /opt/todo-api && docker compose exec -T db pg_dump -U <db_user> -d <db_name> | gzip > /opt/todo-api/backups/todo_api_$(date +%F_%H%M%S).sql.gz'
```

### 4.4 Lưu trữ backup an toàn

- Đồng bộ backup sang **S3/Wasabi/Backblaze B2** hoặc server khác.
- Lưu ít nhất **7-30 ngày** để rollback khi cần.
- Định kỳ thử restore để đảm bảo backup hợp lệ.

## 5) Restore dữ liệu (khi cần rollback DB)

### 5.1 Restore từ file `.sql.gz`

```bash
gunzip -c /opt/todo-api/backups/todo_api_YYYY-MM-DD_HHMMSS.sql.gz \
  | docker compose exec -T db psql -U <db_user> -d <db_name>
```

### 5.2 Restore từ backup volume

```bash
docker run --rm \
  -v todo-api_db-data:/data \
  -v /opt/todo-api/backups:/backup \
  alpine \
  sh -c "cd /data && rm -rf ./* && tar xzf /backup/db-data_YYYY-MM-DD_HHMMSS.tar.gz"
```

## 6) Rollback phiên bản (revert version)

### 6.1 Rollback image Docker

1. Xác định tag commit SHA trước đó (ví dụ từ GitHub Actions hoặc danh sách release).
2. Set lại `IMAGE_REF` rồi pull lại image:

```bash
cd /opt/todo-api
export IMAGE_REF=ghcr.io/<org>/<repo>:<old-commit-sha>
if grep -q '^IMAGE_REF=' .env; then
  sed -i "s#^IMAGE_REF=.*#IMAGE_REF=${IMAGE_REF}#" .env
else
  echo "IMAGE_REF=${IMAGE_REF}" >> .env
fi

docker compose pull
docker compose up -d
```

### 6.2 Rollback DB (nếu schema thay đổi)

- Nếu phiên bản mới có migration làm thay đổi schema, cần **restore DB** từ backup phù hợp với phiên bản cũ.
- Thực hiện theo hướng dẫn ở mục **5) Restore dữ liệu**.

### 6.3 Kiểm tra sau rollback

```bash
docker compose ps
curl -f http://127.0.0.1:3000/healthz
```

## 7) Checklist nhanh

- [ ] VPS cài Docker + Compose.
- [ ] `.env` đã cấu hình đầy đủ biến môi trường.
- [ ] Deploy thành công với `docker compose up -d`.
- [ ] Backup DB định kỳ bằng cron.
- [ ] Có quy trình rollback image + restore DB.

---

> Gợi ý: nên tạo thêm một file `CHANGELOG.md` hoặc sử dụng Git tag để quản lý phiên bản dễ rollback hơn.
