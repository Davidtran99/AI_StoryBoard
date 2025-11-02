# Cách Tối Ưu Nhất để Setup RealChar trên macOS

## 🎯 KẾT LUẬN: Dùng Docker (Best Option)

**Tại sao Docker là tối ưu nhất:**
1. ✅ **Không cần fix dependencies** - Mọi thứ đã sẵn sàng
2. ✅ **Không conflict với Python environment hiện tại**
3. ✅ **Isolated environment** - Không làm rối system
4. ✅ **Consistent** - Chạy giống nhau trên mọi máy
5. ✅ **Dễ cleanup** - Chỉ cần `docker compose down`
6. ✅ **Fast setup** - Chỉ cần 5 phút

---

## 🚀 Hướng Dẫn Setup (3 Bước Đơn Giản)

### Step 1: Install Docker Desktop

**Nếu chưa có Docker:**

```bash
# Download và install Docker Desktop cho macOS
# Link: https://www.docker.com/products/docker-desktop/

# Hoặc dùng Homebrew:
brew install --cask docker

# Start Docker Desktop app (từ Applications)
```

**Verify Docker:**
```bash
docker --version
docker-compose --version
```

### Step 2: Setup RealChar

```bash
cd RealChar

# Copy env file
cp .env.example .env
```

**Edit `.env` file với tối thiểu 1 API key:**

```bash
# Option A: ReByte (FREE tier - RECOMMENDED)
REBYTE_API_KEY=your-rebyte-key-here

# Option B: OpenAI (nếu có)
OPENAI_API_KEY=sk-your-key-here

# Option C: Anthropic Claude (nếu có)
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Lấy API keys:**
- ReByte: https://rebyte.ai (Free tier available)
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com

### Step 3: Run

```bash
# Start tất cả services (backend + frontend + database)
docker compose up

# Hoặc chạy background:
docker compose up -d
```

**Mở browser:** http://localhost:3000

**Xong!** 🎉

---

## 🔍 So Sánh Các Options

| Option | Setup Time | Complexity | Stability | Performance |
|--------|-----------|------------|-----------|-------------|
| **Docker** ⭐ | 5 phút | ⭐ Rất dễ | ⭐⭐⭐⭐⭐ Rất ổn | ⭐⭐⭐⭐ Tốt |
| Manual (skip av) | 15-20 phút | ⭐⭐ Trung bình | ⭐⭐⭐ Ổn | ⭐⭐⭐ Tốt |
| Manual (full) | 30-60 phút | ⭐⭐⭐ Khó | ⭐⭐ Có thể lỗi | ⭐⭐⭐ Tốt |

---

## 🛠️ Các Lệnh Docker Hữu Ích

```bash
# Start services
docker compose up

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Clean up (xóa containers và volumes)
docker compose down -v

# Rebuild images (nếu code thay đổi)
docker compose up --build
```

---

## 🎯 Workflow Đề Xuất

### Development:
```bash
# Terminal 1: Backend + DB
docker compose up db backend

# Terminal 2: Frontend (local để hot-reload nhanh hơn)
cd client/next-web
npm install
npm run dev
```

### Production/Demo:
```bash
# All-in-one
docker compose up
```

---

## ⚠️ Troubleshooting

### Port đã được sử dụng:
```bash
# Check ports
lsof -i :3000
lsof -i :8000
lsof -i :5432

# Kill process hoặc đổi port trong docker-compose.yaml
```

### Docker không start:
```bash
# Check Docker Desktop đang chạy chưa
# Restart Docker Desktop app
```

### Lỗi permission:
```bash
# Add user vào docker group (nếu cần)
# Hoặc dùng sudo (không recommend)
```

---

## 📊 Resource Usage

Docker sẽ dùng:
- **CPU**: ~10-20% khi idle, 30-50% khi active
- **RAM**: ~2-4GB (backend + frontend + database)
- **Disk**: ~5-10GB (images + volumes)

**Lưu ý:** Đảm bảo Mac có đủ RAM (khuyến nghị 8GB+)

---

## 🎁 Bonus Tips

1. **Dùng .env file** để quản lý API keys (đã có trong repo)
2. **Check logs** nếu có lỗi: `docker compose logs`
3. **Update images** định kỳ: `docker compose pull`
4. **Backup data** nếu cần: `docker compose exec db pg_dump ...`

---

## ✅ Checklist Setup

- [ ] Docker Desktop installed
- [ ] `.env` file created với ít nhất 1 API key
- [ ] `docker compose up` chạy thành công
- [ ] Browser mở được http://localhost:3000
- [ ] Có thể chat với character

---

## 🎯 Kết Luận

**Docker là cách tối ưu nhất vì:**
- ✅ Setup nhanh nhất (5 phút)
- ✅ Ít vấn đề nhất
- ✅ Dễ maintain
- ✅ Portable (chạy được trên mọi máy)

**Nếu không có Docker:** Thì skip `faster_whisper` và install manual (xem `FIX_MACOS_INSTALL.md`)

---

**Ready? Let's go!** 🚀

```bash
docker compose up
```

