# RealChar Quick Start trên macOS

## 🎯 Cách Nhanh Nhất: Dùng Docker

### Step 1: Install Docker (nếu chưa có)

Download Docker Desktop: https://www.docker.com/products/docker-desktop/

### Step 2: Setup RealChar

```bash
cd RealChar

# Copy env file
cp .env.example .env

# Edit .env với API key của bạn (tối thiểu cần 1 key)
# - REBYTE_API_KEY (recommended, có free tier)
# - HOẶC OPENAI_API_KEY
# - HOẶC ANTHROPIC_API_KEY
```

### Step 3: Run

```bash
docker compose up
```

### Step 4: Mở Browser

http://localhost:3000

**Xong!** 🎉

---

## ⚠️ Nếu Không Dùng Docker

PyAV (package `av`) không compile được trên macOS Python 3.10. Có 2 options:

### Option A: Skip faster_whisper

Nếu không cần local speech-to-text, có thể skip:

```bash
# Install mà không có faster_whisper
pip install alembic aioconsole anthropic beautifulsoup4 chromadb edge-tts emoji "fastapi[all]" firebase_admin google-cloud-speech httpx langchain llama_index numpy openai pgvector psycopg2-binary pydantic pydub pypdf pytest python-dotenv readerwriterlock "rebyte-langchain>=0.0.5" Requests simpleaudio SpeechRecognition SQLAlchemy starlette twilio

# Sau đó dùng OpenAI Whisper API hoặc Google Speech-to-Text thay vì local
```

### Option B: Dùng Python 3.11+

PyAV có thể compile tốt hơn với Python 3.11+:

```bash
# Install Python 3.11
brew install python@3.11

# Create venv với Python 3.11
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## 📝 API Keys

Tối thiểu cần **1 trong các keys sau**:

1. **ReByte** (recommended): https://rebyte.ai
2. **OpenAI**: https://platform.openai.com
3. **Anthropic Claude**: https://console.anthropic.com

Các keys khác (ElevenLabs, Google, etc.) là optional.

---

## 🚀 Sau Khi Chạy

1. Mở http://localhost:3000
2. Chọn character để chat
3. Có thể chat bằng text hoặc voice
4. Có avatar 3D tương tác!

---

**Recommendation: Dùng Docker để tránh mọi vấn đề dependencies!** 🐳

