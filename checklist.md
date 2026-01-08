# 🚀 Checklist Deploy Production (Chi tiết)

---

### 📦 Build & Artifact
- [ ] **Build binary:** Chạy ở chế độ `--release` để tối ưu hiệu suất.
- [ ] **Docker Image:** Đảm bảo image minimal (sử dụng multi-stage build).
- [ ] **.dockerignore:** Cấu hình để giảm context build và tránh lộ secrets/file rác.
- [ ] **Tagging:** Gắn tag image rõ ràng (ví dụ: `latest`, `git-sha`, `semver`).

### 🔑 Config & Secrets
- [ ] **Secret Management:** Sử dụng Vault, KMS hoặc GitHub Secrets thay vì tệp `.env`.
- [ ] **Biến môi trường:** Thiết lập đầy đủ `DATABASE_URL`, `JWT_SECRET` (>= 32 ký tự), `TTL tokens`, `CORS origins`, `rate limits`.
- [ ] **Network Bind:** Thiết lập `BIND_ADDR=0.0.0.0:3000` khi chạy trong container.

### 🗄️ Database
- [ ] **Migrations:** Bật quy trình chạy migration (dùng job riêng hoặc tiến trình start-up có kiểm soát).
- [ ] **Quyền truy cập:** Tạo user DB hạn chế quyền, tuyệt đối không dùng superuser cho ứng dụng.
- [ ] **Backup:** Thiết lập tự động backup + restore và kiểm tra định kỳ.

### 🛡️ Networking & Security
- [ ] **Reverse Proxy:** Chạy sau proxy (Nginx/Traefik...) có hỗ trợ TLS termination (HTTPS).
- [ ] **Headers:** Cấu hình đúng `X-Forwarded-For` / `X-Forwarded-Proto` để log IP và rate limit chính xác.
- [ ] **Firewall & CORS:** Thiết lập phù hợp với môi trường production.
- [ ] **Resource Limits:** Giới hạn CPU/RAM cho container để tránh gây treo host.

### 📊 Observability
- [ ] **Metrics:** Xuất endpoint `/metrics` về Prometheus/Grafana.
- [ ] **Logging:** Chuẩn hóa log level và định dạng log (ưu tiên JSON).
- [ ] **Alerting:** Thiết lập cảnh báo dựa trên tỉ lệ lỗi (error rate) và độ trễ (latency).

### 🔄 CI/CD
- [ ] **Quality Control:** Tự động chạy lint (`fmt`/`clippy`), build và chạy bộ test.
- [ ] **Automation:** Tự động build & publish image lên registry sau khi test pass.
- [ ] **Pipeline:** Tách biệt luồng pipeline giữa staging và production.

### 🚀 Release & Rollback
- [ ] **Versioning:** Có hệ thống quản lý phiên bản theo SemVer hoặc Git SHA.
- [ ] **Retention:** Lưu giữ ít nhất N image gần nhất để có thể rollback tức thì.
- [ ] **Smoke Test:** Thực hiện kiểm tra nhanh các tính năng chính ngay sau khi deploy.