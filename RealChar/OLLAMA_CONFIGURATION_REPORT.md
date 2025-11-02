# 🤖 Ollama Configuration Report - RealChar Integration

## 📋 Tổng quan

Tài liệu này mô tả cấu hình tích hợp **Ollama** (Local LLM) với **RealChar** để sử dụng các mô hình LLM chạy local thay vì API bên ngoài.

---

## 🎯 Kiến trúc Integration

```
┌─────────────────────────────────────────────────────────────┐
│                    RealChar Application                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Backend (FastAPI)                      │  │
│  │  - Runs in Docker container                         │  │
│  │  - Port: 8000                                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                         │                                   │
│                         │ HTTP Request                      │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         LocalLlm Class (local_llm.py)              │  │
│  │  - Uses LangChain ChatOpenAI                        │  │
│  │  - OpenAI-compatible API format                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                         │                                   │
│                         │ via host.docker.internal         │
│                         ▼                                   │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ http://host.docker.internal:11434/v1
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Ollama Service (Host)                     │
│  - Runs on macOS/Linux host                                 │
│  - Port: 11434                                              │
│  - Provides OpenAI-compatible API                           │
│  - Models: llama3.2:3b, mistral, phi3, etc.                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Files Cấu hình

### 1. Environment Variables (`.env`)

```env
# Local LLM Configuration (with OpenAI Compatible API)
LOCAL_LLM_URL=http://host.docker.internal:11434/v1

# Set model to localhost to use LocalLlm
LLM_MODEL_USE=localhost
```

**Giải thích:**
- `LOCAL_LLM_URL`: URL của Ollama API endpoint (OpenAI-compatible)
  - `host.docker.internal`: Địa chỉ đặc biệt để Docker container truy cập host machine
  - `11434`: Port mặc định của Ollama
  - `/v1`: OpenAI-compatible API path
  
- `LLM_MODEL_USE`: Chỉ định sử dụng local LLM thay vì remote APIs

### 2. Docker Compose Configuration (`docker-compose.yaml`)

```yaml
services:
  backend:
    extra_hosts:
      - "host.docker.internal:host-gateway"  # ✅ Critical for Ollama access
```

**Giải thích:**
- `extra_hosts: host.docker.internal:host-gateway`: Cho phép container truy cập services trên host machine
  - Điều này cần thiết vì Ollama chạy trên host, không phải trong container
  - Docker tự động map `host.docker.internal` đến IP của host

### 3. Backend LLM Implementation

#### 3.1 LocalLlm Class (`realtime_ai_character/llm/local_llm.py`)

```python
from langchain.chat_models import ChatOpenAI

class LocalLlm(LLM):
    def __init__(self, url):
        self.chat_open_ai = ChatOpenAI(
            model="Local LLM",
            temperature=0.5,
            streaming=True,
            openai_api_base=url,  # Ollama API URL
        )
```

**Đặc điểm:**
- ✅ Sử dụng LangChain `ChatOpenAI` với `openai_api_base` trỏ đến Ollama
- ✅ Hỗ trợ streaming responses
- ✅ Tích hợp Chroma knowledge base cho context retrieval
- ✅ Temperature: 0.5 (cân bằng giữa sáng tạo và chính xác)

#### 3.2 LLM Factory (`realtime_ai_character/llm/__init__.py`)

```python
if model == "localhost":
    local_llm_url = os.getenv("LOCAL_LLM_URL", "")
    if local_llm_url:
        from realtime_ai_character.llm.local_llm import LocalLlm
        return LocalLlm(url=local_llm_url)
```

---

## 🚀 Setup Instructions

### 1. Install Ollama

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Start Ollama Service

```bash
ollama serve
# Verify: curl http://localhost:11434/api/tags
```

### 3. Pull Ollama Models

```bash
ollama pull llama3.2:3b    # Small, fast
ollama pull mistral         # Balanced
ollama pull phi3:mini       # Lightweight
ollama list                 # List models
```

### 4. Configure RealChar

**Step 1:** Update `.env` file:
```env
LOCAL_LLM_URL=http://host.docker.internal:11434/v1
LLM_MODEL_USE=localhost
```

**Step 2:** Verify `docker-compose.yaml` has:
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

**Step 3:** Restart backend:
```bash
docker compose restart backend
```

---

## ✅ Testing

### 1. Test Ollama API Directly

```bash
curl http://localhost:11434/v1/models
```

### 2. Test from Docker Container

```bash
docker compose exec backend sh
curl http://host.docker.internal:11434/v1/models
```

---

## 🔧 Troubleshooting

### Issue 1: Cannot connect to Ollama from Docker

**Solutions:**
1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Verify `extra_hosts` in docker-compose.yaml
3. Try using host IP directly in `.env`

### Issue 2: Model not found

**Solutions:**
```bash
ollama pull llama3.2:3b
ollama list
```

---

## 📊 Performance Comparison

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| llama3.2:3b | 2.0GB | ⚡⚡⚡ Fast | ⭐⭐⭐ Good | Quick responses |
| mistral:7b | 4.1GB | ⚡⚡ Medium | ⭐⭐⭐⭐ Very Good | Balanced |
| phi3:mini | 2.3GB | ⚡⚡⚡ Fast | ⭐⭐⭐ Good | Lightweight |

**Recommendations:**
- **Development/Testing**: `llama3.2:3b` or `phi3:mini`
- **Production**: `mistral:7b`

---

## 🔐 Security Notes

1. **Local Only**: Ollama chạy local, không cần internet
2. **No API Keys**: Không cần API keys cho local LLM
3. **Docker Isolation**: RealChar backend chạy trong container
4. **Network**: Chỉ truy cập nội bộ qua `host.docker.internal`

---

## ✅ Checklist Setup

- [ ] Ollama installed on host machine
- [ ] Ollama service running
- [ ] Ollama models pulled
- [ ] `.env` file configured with `LOCAL_LLM_URL`
- [ ] `.env` file configured with `LLM_MODEL_USE=localhost`
- [ ] `docker-compose.yaml` has `extra_hosts: host.docker.internal`
- [ ] Backend container restarted
- [ ] Connection tested from container
- [ ] Chat tested in RealChar web UI

---

## 📝 Summary

**Ollama Integration với RealChar cho phép:**

✅ Chạy LLM hoàn toàn local, không cần internet  
✅ Không cần API keys từ bên thứ ba  
✅ Kiểm soát hoàn toàn dữ liệu và models  
✅ Privacy cao (dữ liệu không rời khỏi máy)  

**Best Practice:**
- Development: Dùng small models (llama3.2:3b) cho speed
- Production: Dùng larger models (mistral:7b) cho quality

---

**Date:** 2024-11-02  
**Version:** RealChar + Ollama Integration  
**Status:** ✅ Production Ready
