FROM python:3.11-slim

# Install dependencies necessary to build and run FFmpeg
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    yasm \
    git \
    curl \
    portaudio19-dev \
    libffi-dev \
    libssl-dev \
    libx264-dev \
    libopus-dev

RUN echo "deb http://deb.debian.org/debian/ bullseye main\ndeb-src http://deb.debian.org/debian/ bullseye main" | tee /etc/apt/sources.list.d/ffmpeg.list  &&\
    apt-get update && \
    apt-get install -y \
    ffmpeg \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev


WORKDIR /realtime_ai_character

# Install Python dependencies (skip faster_whisper - can use API instead)
COPY requirements.txt /realtime_ai_character
RUN pip install --upgrade pip setuptools wheel cython && \
    pip install alembic==1.11.1 aioconsole==0.6.2 anthropic==0.8.1 beautifulsoup4==4.12.2 chromadb==0.4.13 edge-tts==6.1.9 emoji==2.9.0 "fastapi[all]==0.103.2" firebase_admin==6.2.0 google-cloud-speech==2.23.0 httpx==0.25.0 langchain==0.0.308 llama_index==0.8.39.post2 numpy==1.26.0 openai==0.27.8 pgvector==0.2.3 psycopg2-binary==2.9.9 pydantic==2.4.2 pydub==0.25.1 pypdf==3.16.2 pytest==7.4.2 python-dotenv==1.0.0 readerwriterlock==1.0.9 "rebyte-langchain>=0.0.5" Requests==2.31.0 simpleaudio==1.0.4 SpeechRecognition==3.10.0 SQLAlchemy==2.0.21 starlette==0.27 twilio==8.9.0

# Copy the project files
COPY ./ /realtime_ai_character

# Expose 8000 port from the docker image.
EXPOSE 8000

# Make the entrypoint script executable
RUN chmod +x /realtime_ai_character/entrypoint.sh

# Run the application
CMD ["/bin/sh", "/realtime_ai_character/entrypoint.sh"]
