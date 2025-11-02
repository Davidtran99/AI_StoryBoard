#!/bin/bash

echo "🚀 RealChar Docker Setup Script"
echo "================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker chưa được install"
    echo ""
    echo "Cài đặt Docker Desktop:"
    echo "1. Download từ: https://www.docker.com/products/docker-desktop/"
    echo "2. Hoặc chạy: brew install --cask docker"
    echo ""
    echo "Sau khi cài, mở Docker Desktop app và chạy lại script này"
    exit 1
fi

# Check if Docker daemon is running
if ! docker ps &> /dev/null; then
    echo "⚠️  Docker daemon chưa chạy"
    echo ""
    echo "Hãy mở Docker Desktop app từ Applications"
    echo "Đợi đến khi Docker icon trên menu bar hiển thị 'Docker Desktop is running'"
    echo ""
    read -p "Nhấn Enter sau khi Docker Desktop đã chạy..."
fi

# Verify Docker is working
if docker ps &> /dev/null; then
    echo "✅ Docker đang chạy!"
else
    echo "❌ Docker vẫn chưa chạy. Vui lòng mở Docker Desktop"
    exit 1
fi

# Check .env file
if [ ! -f .env ]; then
    echo "📝 Tạo .env file..."
    cp .env.example .env
fi

# Check if API key is set
if grep -q "REBYTE_API_KEY=YOUR_API_KEY" .env || grep -q "OPENAI_API_KEY=YOUR_API_KEY" .env; then
    echo ""
    echo "⚠️  API Key chưa được config!"
    echo ""
    echo "Bạn cần thêm ít nhất 1 API key vào file .env:"
    echo ""
    echo "Option 1: ReByte (FREE - Recommended)"
    echo "  1. Đăng ký tại: https://rebyte.ai"
    echo "  2. Lấy API key từ Settings"
    echo "  3. Thêm vào .env: REBYTE_API_KEY=your-key-here"
    echo ""
    echo "Option 2: OpenAI"
    echo "  1. Đăng ký tại: https://platform.openai.com"
    echo "  2. Tạo API key"
    echo "  3. Thêm vào .env: OPENAI_API_KEY=sk-your-key-here"
    echo ""
    echo "Option 3: Anthropic Claude"
    echo "  1. Đăng ký tại: https://console.anthropic.com"
    echo "  2. Tạo API key"
    echo "  3. Thêm vào .env: ANTHROPIC_API_KEY=sk-ant-your-key-here"
    echo ""
    read -p "Nhấn Enter sau khi đã thêm API key vào .env file..."
fi

# Final check
if grep -q "REBYTE_API_KEY=YOUR_API_KEY" .env && ! grep -qE "OPENAI_API_KEY=(sk-|YOUR_API_KEY)" .env && ! grep -qE "ANTHROPIC_API_KEY=(sk-ant-|YOUR_API_KEY)" .env; then
    echo ""
    echo "❌ Vẫn chưa có API key hợp lệ trong .env"
    echo "Vui lòng mở file .env và thêm API key"
    exit 1
fi

echo ""
echo "✅ Mọi thứ đã sẵn sàng!"
echo ""
echo "🚀 Đang start RealChar với Docker..."
echo ""

# Start docker compose
docker compose up

