# 🚀 Cách Start RealChar - Hướng Dẫn Đơn Giản

## ⚠️ Vấn Đề Hiện Tại

Docker Desktop chưa được cài đặt hoặc chưa chạy.

## ✅ Giải Pháp

### Bước 1: Cài Docker Desktop

**Cách 1: Qua Homebrew (Recommended)**
```bash
brew install --cask docker
```

**Cách 2: Download Trực Tiếp**
- Vào: https://www.docker.com/products/docker-desktop/
- Download cho Mac (Apple Silicon hoặc Intel)
- Mở file .dmg và cài đặt

### Bước 2: Mở Docker Desktop

Sau khi cài, mở Docker Desktop:
```bash
open /Applications/Docker.app
```

**Hoặc thủ công:**
- Applications → Docker → Docker.app
- Đợi đến khi icon Docker xuất hiện trên menu bar
- Icon sẽ hiển thị "Docker Desktop is running"

### Bước 3: Verify Docker

```bash
docker --version
```

Nếu hiển thị version → ✅ OK!

### Bước 4: Chạy RealChar

```bash
cd RealChar
docker compose up
```

**Hoặc chạy background:**
```bash
docker compose up -d
```

### Bước 5: Mở Browser

**http://localhost:3000**

---

## 🎯 Quick Start (Sau Khi Docker Sẵn Sàng)

```bash
# 1. Verify Docker
docker --version

# 2. Start RealChar
cd RealChar
docker compose up

# 3. Mở browser: http://localhost:3000
```

---

## 📊 Commands Hữu Ích

```bash
# Start
docker compose up

# Start in background
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f

# Restart
docker compose restart

# Check status
docker compose ps
```

---

**Sau khi Docker Desktop chạy, chạy `docker compose up` là xong!** 🎉

