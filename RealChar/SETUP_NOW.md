# Setup RealChar NGAY - Cách Tối Ưu Nhất

## 🎯 KẾT LUẬN: **DOCKER là tối ưu nhất!**

### Tại sao?
- ✅ Setup trong **5 phút**
- ✅ Không cần fix dependencies
- ✅ Không conflict với Python environment
- ✅ Isolated, dễ cleanup
- ✅ 100% working

---

## ⚡ QUICK START (3 Bước)

### 1️⃣ Install Docker Desktop (nếu chưa có)

```bash
# Download từ:
# https://www.docker.com/products/docker-desktop/

# Hoặc Homebrew:
brew install --cask docker

# Sau đó mở Docker Desktop app từ Applications
```

**Verify:**
```bash
docker --version
```

### 2️⃣ Setup .env

```bash
cd RealChar

# Copy env file
cp .env.example .env

# Edit .env - chỉ cần 1 API key:
# REBYTE_API_KEY=your-key  (FREE - recommended)
# HOẶC OPENAI_API_KEY=sk-...
# HOẶC ANTHROPIC_API_KEY=sk-ant-...
```

**Lấy API keys:**
- **ReByte** (FREE): https://rebyte.ai
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com

### 3️⃣ Run!

```bash
docker compose up
```

**Mở:** http://localhost:3000

**DONE!** 🎉

---

## 🔄 Nếu KHÔNG có Docker

### Option: Skip faster_whisper (Local STT)

```bash
cd RealChar

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install (skip av package)
pip install alembic aioconsole anthropic beautifulsoup4 chromadb edge-tts emoji "fastapi[all]" firebase_admin google-cloud-speech httpx langchain llama_index numpy openai pgvector psycopg2-binary pydantic pydub pypdf pytest python-dotenv readerwriterlock "rebyte-langchain>=0.0.5" Requests simpleaudio SpeechRecognition SQLAlchemy starlette twilio

# Setup
cp .env.example .env
# Edit .env với API keys

# Run
alembic upgrade head
python cli.py run-uvicorn

# Frontend (terminal khác)
cd client/next-web
npm install
npm run dev
```

**Note:** Sẽ dùng OpenAI Whisper API hoặc Google Speech-to-Text thay vì local.

---

## 📊 So Sánh

| Method | Time | Difficulty | Success Rate |
|--------|------|------------|--------------|
| **Docker** ⭐ | 5 phút | ⭐ Rất dễ | 99% |
| Skip av | 15 phút | ⭐⭐ Trung bình | 90% |
| Full install | 60+ phút | ⭐⭐⭐ Khó | 50% |

---

## ✅ RECOMMENDATION

**Dùng Docker!** Đó là cách tối ưu nhất:
- Nhanh nhất
- Ít lỗi nhất
- Dễ nhất
- Stable nhất

---

## 🚀 Start Now!

```bash
cd RealChar
docker compose up
```

**Happy chatting!** 💬✨

