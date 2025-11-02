# Ollama Setup - Hoàn Tất

## Đã Cấu Hình:

### 1. Ollama Service
- ✅ Ollama đã được cài đặt
- ✅ Ollama service đang chạy tại `http://localhost:11434`

### 2. Environment Variables
- ✅ `LOCAL_LLM_URL=http://host.docker.internal:11434/v1`
- ✅ `LLM_MODEL_USE=localhost`
- ✅ `SPEECH_TO_TEXT_USE=OPENAI_WHISPER` (cần OPENAI_API_KEY)

### 3. Docker Configuration
- ✅ Thêm `extra_hosts` vào docker-compose.yaml để backend truy cập Ollama trên host

### 4. Backend
- ✅ Backend đã restart với config mới

---

## ⚠️ Cần Hoàn Thành:

### 1. Pull Ollama Model
Ollama pull đang gặp lỗi authentication. Cần pull model thủ công:

```bash
# Mở Ollama app hoặc chạy:
ollama pull llama3.2:3b

# Hoặc model khác:
ollama pull mistral
ollama pull phi3
```

**Verify model:**
```bash
ollama list
```

### 2. Speech-to-Text API Key
Backend cần `OPENAI_API_KEY` cho Whisper API:

**Option A:** Thêm OPENAI_API_KEY vào .env
```bash
OPENAI_API_KEY=your_key_here
```

**Option B:** Switch sang Google STT (cần credentials file)
```bash
SPEECH_TO_TEXT_USE=GOOGLE
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

**Option C:** Dùng Edge TTS only (no STT, chỉ TTS)

---

## 🔧 Sau Khi Pull Model:

1. Restart backend:
```bash
docker compose restart backend
```

2. Check logs:
```bash
docker compose logs backend | grep -i llm
```

3. Test chat tại: http://localhost:3000

---

## ✅ Status:

- ✅ Ollama configured
- ✅ Docker network configured  
- ⏳ Waiting for model pull
- ⏳ Need OPENAI_API_KEY for STT

---

**Sau khi pull model và config API key, chat sẽ hoạt động!** 🎯

