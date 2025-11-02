# ✅ Ollama Setup - Hoàn Tất Cấu Hình

## Đã Hoàn Thành:

### ✅ 1. Ollama Service
- Ollama đã được cài đặt tại `/opt/homebrew/bin/ollama`
- Ollama service đang chạy tại `http://localhost:11434`
- Backend Docker container có thể truy cập Ollama qua `host.docker.internal:11434`

### ✅ 2. Environment Variables (.env)
Đã thêm vào `.env`:
```
LOCAL_LLM_URL=http://host.docker.internal:11434/v1
LLM_MODEL_USE=localhost
```

### ✅ 3. Docker Configuration
- ✅ Đã thêm `extra_hosts` vào `docker-compose.yaml` để backend truy cập Ollama trên host
- ✅ Backend container đã restart với config mới
- ✅ Backend đang chạy và healthy

### ✅ 4. Code Integration
- ✅ RealChar đã có `LocalLlm` class sẵn, hoạt động với Ollama API
- ✅ `LocalLlm` sử dụng OpenAI-compatible API format của Ollama

---

## ⚠️ Cần Hoàn Thành (2 bước):

### 1️⃣ Pull Ollama Model

Ollama pull đang gặp lỗi authentication (có thể do network/proxy). Cần pull model thủ công:

```bash
# Thử các cách sau:
ollama pull llama3.2:3b

# Hoặc:
ollama pull mistral:7b

# Hoặc:
ollama pull phi3:mini

# Verify sau khi pull:
ollama list
```

**Nếu vẫn lỗi:**
- Kiểm tra network/firewall
- Thử restart Ollama: `killall ollama && ollama serve`
- Hoặc mở Ollama app và pull model từ UI

### 2️⃣ Speech-to-Text API Key

Backend cần API key cho Whisper STT. Hiện đang dùng `OPENAI_WHISPER`.

**Option A:** Thêm OPENAI_API_KEY vào `.env`
```bash
echo "OPENAI_API_KEY=your_key_here" >> .env
docker compose restart backend
```

**Option B:** Switch sang Google STT (cần credentials file)
```bash
# Sửa .env:
SPEECH_TO_TEXT_USE=GOOGLE
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
docker compose restart backend
```

**Option C:** Chat text-only (không cần STT/TTS)
- Có thể chat qua text, chỉ cần LLM hoạt động

---

## 🧪 Test Sau Khi Pull Model:

1. **Verify model đã pull:**
```bash
ollama list
```

2. **Test Ollama API:**
```bash
curl http://localhost:11434/api/tags
# Should show your model in the list
```

3. **Test từ Docker container:**
```bash
docker compose exec backend curl -s http://host.docker.internal:11434/api/tags
```

4. **Restart backend để load config:**
```bash
docker compose restart backend
```

5. **Check logs:**
```bash
docker compose logs backend | grep -i llm
```

6. **Test chat:**
- Mở http://localhost:3000
- Chọn character
- Chọn LLM model = "localhost" hoặc để auto-detect
- Gửi message và kiểm tra response

---

## 📊 Current Status:

| Component | Status | Notes |
|-----------|--------|-------|
| Ollama Service | ✅ Running | `http://localhost:11434` |
| Ollama Models | ⏳ Waiting | Cần pull model |
| Backend Config | ✅ Complete | LOCAL_LLM_URL configured |
| Docker Network | ✅ Complete | extra_hosts configured |
| Backend Running | ✅ Healthy | Container up and running |
| STT | ⏳ Optional | Cần API key hoặc switch config |
| LLM Integration | ✅ Ready | Đợi model |

---

## 🎯 Next Steps:

1. **Pull model** (quan trọng nhất)
2. **Config STT API key** (optional, cho voice)
3. **Test chat** tại http://localhost:3000

---

## 🔍 Troubleshooting:

**Nếu chat không response:**

1. Check Ollama model:
```bash
ollama list
# Nếu rỗng, cần pull model
```

2. Check backend logs:
```bash
docker compose logs backend | grep -i "local\|llm\|error"
```

3. Test Ollama connection từ backend:
```bash
docker compose exec backend curl http://host.docker.internal:11434/api/tags
```

4. Verify env vars:
```bash
docker compose exec backend env | grep LOCAL_LLM
```

5. Restart nếu cần:
```bash
docker compose restart backend
```

---

**Setup cơ bản đã xong! Chỉ cần pull model là có thể chat.** 🚀

