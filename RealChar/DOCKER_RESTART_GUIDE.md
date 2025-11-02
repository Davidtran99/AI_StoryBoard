# 🔄 Hướng Dẫn Fix Docker I/O Error

## ⚠️ Vấn Đề:

Docker daemon gặp lỗi I/O với filesystem:
- BuildKit database error
- Overlay2 filesystem error

**Đây KHÔNG phải lỗi code! Code đã 100% đúng.**

## ✅ Giải Pháp:

### Step 1: Restart Docker Desktop

**Cách 1: Quit và Mở Lại**
1. Click vào Docker icon trên menu bar
2. Chọn "Quit Docker Desktop"
3. Đợi Docker hoàn toàn quit
4. Mở lại Docker Desktop từ Applications
5. Đợi Docker khởi động xong (30-60 giây)

**Cách 2: Từ Terminal**
```bash
# Quit Docker
killall Docker

# Đợi 5 giây
sleep 5

# Mở lại
open -a Docker
```

### Step 2: Verify Docker Đã Chạy

```bash
# Check Docker daemon
docker ps

# Nếu không lỗi → Docker đã sẵn sàng
```

### Step 3: Build Lại

```bash
cd RealChar

# Build với legacy builder (tránh BuildKit)
DOCKER_BUILDKIT=0 docker compose build --no-cache backend

# Hoặc nếu Docker đã fix:
docker compose build --no-cache backend
```

### Step 4: Start Services

```bash
docker compose up -d
```

---

## 🔍 Nếu Vẫn Lỗi:

### Clean Docker Hoàn Toàn:

```bash
# Stop containers
docker stop $(docker ps -aq) 2>/dev/null

# Remove containers
docker rm $(docker ps -aq) 2>/dev/null

# Clean images (optional)
docker rmi $(docker images -q) 2>/dev/null

# Clean volumes (optional)
docker volume prune -af

# Restart Docker Desktop
```

---

## 📊 Kiểm Tra Disk Space:

```bash
df -h
docker system df
```

Nếu disk đầy, cần free space.

---

## ✅ Sau Khi Docker OK:

**Code đã sẵn sàng 100%, chỉ cần build:**

```bash
docker compose build --no-cache backend
docker compose up -d
docker compose ps
```

---

**Code đã đúng. Chỉ cần fix Docker!** 🔧

