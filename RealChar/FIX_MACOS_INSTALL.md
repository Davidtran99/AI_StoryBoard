# Fix Lỗi Install RealChar trên macOS

## ⚠️ Lỗi Gặp Phải

Package `av==10.*` (PyAV) không compile được trên macOS vì:
- Thiếu `ffmpeg` (cần để compile PyAV)
- Lỗi Cython compilation với Python 3.10

## ✅ Giải Pháp

### Option 1: Dùng Docker (RECOMMENDED - Dễ Nhất!)

Docker đã có mọi dependencies, không cần install thủ công.

```bash
# 1. Install Docker Desktop (nếu chưa có)
# Download từ: https://www.docker.com/products/docker-desktop/

# 2. Copy env file
cd RealChar
cp .env.example .env

# 3. Edit .env file với API keys của bạn

# 4. Run với Docker
docker compose up
```

Sau đó mở: http://localhost:3000

**Ưu điểm:**
- ✅ Không cần install dependencies
- ✅ Hoạt động ngay
- ✅ Không conflict với Python environment

---

### Option 2: Fix Manual Install

Nếu muốn install trực tiếp trên macOS:

#### Step 1: Install System Dependencies

```bash
# Install ffmpeg (bắt buộc cho PyAV)
brew install ffmpeg

# Install portaudio (cho PyAudio)
brew install portaudio

# Set library path (cho Apple Silicon)
export DYLD_LIBRARY_PATH=/opt/homebrew/lib:$DYLD_LIBRARY_PATH

# Hoặc thêm vào ~/.zshrc để persistent:
echo 'export DYLD_LIBRARY_PATH=/opt/homebrew/lib:$DYLD_LIBRARY_PATH' >> ~/.zshrc
source ~/.zshrc
```

#### Step 2: Tạo Virtual Environment (Recommended)

```bash
cd RealChar

# Tạo venv
python3 -m venv venv

# Activate
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip
```

#### Step 3: Install Dependencies (Skip av nếu vẫn lỗi)

```bash
# Try install với ffmpeg đã có
pip install -r requirements.txt

# Nếu vẫn lỗi với av, có thể skip và install từng package:
# (faster_whisper không bắt buộc nếu dùng OpenAI Whisper API)

pip install -r requirements.txt --ignore-installed av

# Hoặc install từng package, skip av:
pip install alembic aioconsole anthropic beautifulsoup4 chromadb edge-tts emoji "fastapi[all]" firebase_admin google-cloud-speech httpx langchain llama_index numpy openai pgvector psycopg2-binary pydantic pydub pypdf pytest python-dotenv readerwriterlock "rebyte-langchain>=0.0.5" Requests simpleaudio SpeechRecognition SQLAlchemy starlette twilio

# Note: faster_whisper cần av, nếu skip av thì faster_whisper cũng sẽ fail
# Nhưng bạn có thể dùng OpenAI Whisper API hoặc Google Speech-to-Text thay thế
```

#### Step 4: Configure .env

```bash
cp .env.example .env
# Edit .env với API keys của bạn
```

#### Step 5: Run

```bash
# Setup database
alembic upgrade head

# Run server
python cli.py run-uvicorn
# hoặc
uvicorn realtime_ai_character.main:app

# Run frontend (separate terminal)
cd client/next-web
npm install
npm run dev
```

---

### Option 3: Skip faster_whisper (Nếu không cần local STT)

Nếu bạn dùng OpenAI Whisper API hoặc Google Speech-to-Text (không cần local):

```bash
# Tạo requirements.txt mới không có faster_whisper
cat requirements.txt | grep -v "faster_whisper" > requirements_simple.txt

# Install
pip install -r requirements_simple.txt

# Configure .env để dùng OpenAI Whisper API thay vì local
```

---

## 🎯 Recommendation

**Dùng Docker (Option 1)** vì:
1. ✅ Không cần fix dependencies
2. ✅ Hoạt động ngay
3. ✅ Dễ cleanup
4. ✅ Consistent environment

Nếu không có Docker, thử **Option 2** với virtual environment.

---

## 📝 API Keys Cần Thiết

Tối thiểu cần 1 trong các keys này:

1. **ReByte API** (recommended - có free tier)
2. **OpenAI API** (nếu có)
3. **Anthropic Claude** (nếu có)

Các keys khác (ElevenLabs, Google, etc.) là optional.

Xem file `.env.example` để biết format.

---

## 🔗 Links

- Docker Desktop: https://www.docker.com/products/docker-desktop/
- RealChar Docs: https://github.com/Shaunwei/RealChar
- RealChar Discord: Join để hỗ trợ

