# 🚀 RealChar Setup - Hướng Dẫn Hoàn Chỉnh

## ✅ Đã Hoàn Thành:

1. ✅ Clone RealChar repo
2. ✅ Docker Desktop đã được install (hoặc đang trong quá trình)

## 📋 Các Bước Tiếp Theo:

### Bước 1: Mở Docker Desktop

```bash
# Mở Docker Desktop từ Applications
open /Applications/Docker.app
```

**Hoặc mở thủ công:**
- Vào Applications → Docker.app
- Đợi đến khi icon Docker trên menu bar hiển thị "Docker Desktop is running"

### Bước 2: Setup API Key

File `.env` đã có sẵn, nhưng cần thêm API key:

**Option 1: ReByte (FREE - Recommended)**
1. Đăng ký tại: https://rebyte.ai
2. Vào Settings → API Keys
3. Copy API key
4. Mở file `.env` và thay:
   ```
   REBYTE_API_KEY=YOUR_API_KEY
   ```
   Thành:
   ```
   REBYTE_API_KEY=your-actual-key-here
   ```

**Option 2: OpenAI**
1. Đăng ký tại: https://platform.openai.com/api-keys
2. Tạo API key mới
3. Thêm vào `.env`:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```

**Option 3: Anthropic Claude**
1. Đăng ký tại: https://console.anthropic.com
2. Tạo API key
3. Thêm vào `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

### Bước 3: Chạy RealChar

Sau khi Docker Desktop đã chạy và API key đã được thêm:

```bash
cd RealChar
docker compose up
```

**Hoặc dùng script tự động:**
```bash
./setup_docker.sh
```

### Bước 4: Mở Browser

Sau khi docker compose up chạy thành công, mở:
**http://localhost:3000**

---

## 🎯 Quick Commands

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
```

---

## ❓ Troubleshooting

### Docker không chạy:
```bash
# Check Docker daemon
docker ps

# Nếu lỗi, mở Docker Desktop app
open /Applications/Docker.app
```

### Port đã được sử dụng:
```bash
# Check ports
lsof -i :3000
lsof -i :8000
```

### API key không hoạt động:
- Check lại file `.env` có API key hợp lệ chưa
- Test API key trên website của provider

---

## 🎉 Ready to Go!

Sau khi hoàn thành các bước trên, bạn sẽ có:
- ✅ Real-time AI chat với avatar
- ✅ Voice chat support
- ✅ Multiple characters
- ✅ Web interface tại http://localhost:3000

**Enjoy!** 💬✨

