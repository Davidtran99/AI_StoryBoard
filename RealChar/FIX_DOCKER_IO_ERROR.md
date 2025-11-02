# 🔧 Fix Docker BuildKit I/O Error

## ⚠️ Vấn Đề:

Docker BuildKit gặp lỗi I/O khi write database:
```
failed to solve: Internal: write /var/lib/docker/buildkit/containerdmeta.db: input/output error
```

## ✅ Đã Fix:

1. **Prune Docker BuildKit cache** - Đã chạy `docker builder prune -af`
2. **Disable BuildKit tạm thời** - Dùng `DOCKER_BUILDKIT=0` để bypass BuildKit
3. **Build đang chạy** - Đang build với legacy builder

## 🔄 Các Bước Đã Thực Hiện:

### 1. Clean BuildKit Cache
```bash
docker builder prune -af
```

### 2. Build với Legacy Builder (không dùng BuildKit)
```bash
DOCKER_BUILDKIT=0 docker compose build --no-cache backend
```

## 📋 Nếu Vẫn Lỗi:

### Option A: Restart Docker Desktop
```bash
# Restart Docker Desktop app
# Hoặc:
killall Docker && open -a Docker
```

### Option B: Reset Docker BuildKit
```bash
docker buildx prune -af
docker system prune -af
```

### Option C: Check Disk Space
```bash
df -h
docker system df
```

---

**Build đang chạy với legacy builder (không BuildKit). Đợi vài phút...** ⏳

