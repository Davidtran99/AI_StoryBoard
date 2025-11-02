# ⚡ Quick Start - Chỉ 1 Lệnh!

## 🎯 Cách Nhanh Nhất

**Docker Desktop cần được mở và chạy trước!**

### Bước 1: Mở Docker Desktop

**Nếu Docker Desktop chưa mở:**
```bash
open -a Docker
```

**Hoặc:** Applications → Docker → Docker.app

**Đợi đến khi:**
- Icon Docker xuất hiện trên menu bar (góc trên bên phải)
- Hiển thị "Docker Desktop is running"

### Bước 2: Chạy RealChar

```bash
cd RealChar
./start_realchar.sh
```

**Hoặc thủ công:**
```bash
docker compose up
```

---

## 🔍 Kiểm Tra Nhanh

**Check Docker:**
```bash
docker ps
```

Nếu không lỗi → ✅ Docker sẵn sàng!

**Check RealChar:**
```bash
docker compose ps
```

**Mở browser:** http://localhost:3000

---

## ⚠️ Nếu Docker Chưa Chạy

**Lỗi:** `Cannot connect to the Docker daemon`

**Giải pháp:**
1. Mở Docker Desktop app
2. Đợi 30-60 giây
3. Chạy lại lệnh

---

**Ready? Run `./start_realchar.sh` !** 🚀

