#!/bin/bash

echo "🔍 Kiểm Tra Setup RealChar"
echo "=========================="
echo ""

# Check Docker
echo "1. Docker Desktop:"
if command -v docker &> /dev/null; then
    if docker ps &> /dev/null; then
        echo "   ✅ Docker đang chạy"
        docker --version
    else
        echo "   ⚠️  Docker installed nhưng daemon chưa chạy"
        echo "   → Hãy mở Docker Desktop app"
    fi
else
    echo "   ❌ Docker chưa được install hoặc chưa trong PATH"
    echo "   → Mở Docker Desktop từ Applications"
fi

echo ""

# Check docker-compose
echo "2. docker-compose:"
if command -v docker-compose &> /dev/null; then
    docker-compose --version
    echo "   ✅ docker-compose sẵn sàng"
else
    echo "   ❌ docker-compose không tìm thấy"
fi

echo ""

# Check API key
echo "3. API Key Configuration:"
if [ -f .env ]; then
    if grep -qE "REBYTE_API_KEY=(?!YOUR_API_KEY|^#)" .env 2>/dev/null || grep -qE "REBYTE_API_KEY=[a-zA-Z0-9]" .env 2>/dev/null; then
        echo "   ✅ ReByte API key đã được config"
    elif grep -qE "OPENAI_API_KEY=sk-" .env; then
        echo "   ✅ OpenAI API key đã được config"
    elif grep -qE "ANTHROPIC_API_KEY=sk-ant-" .env; then
        echo "   ✅ Anthropic API key đã được config"
    else
        echo "   ❌ API key chưa được config"
        echo "   → Mở file .env và thay YOUR_API_KEY bằng key thật"
        echo "   → ReByte (FREE): https://rebyte.ai"
        echo "   → OpenAI: https://platform.openai.com/api-keys"
    fi
else
    echo "   ❌ File .env không tìm thấy"
    echo "   → Chạy: cp .env.example .env"
fi

echo ""

# Check files
echo "4. Files:"
if [ -f docker-compose.yaml ]; then
    echo "   ✅ docker-compose.yaml"
else
    echo "   ❌ docker-compose.yaml không tìm thấy"
fi

if [ -f Dockerfile ]; then
    echo "   ✅ Dockerfile"
else
    echo "   ❌ Dockerfile không tìm thấy"
fi

if [ -f .env ]; then
    echo "   ✅ .env file"
else
    echo "   ❌ .env file không tìm thấy"
fi

echo ""
echo "=========================="
echo ""

# Final summary
echo "📋 Tóm Tắt:"
echo ""

if command -v docker &> /dev/null && docker ps &> /dev/null; then
    DOCKER_OK=true
else
    DOCKER_OK=false
    echo "❌ Cần mở Docker Desktop"
fi

if grep -qE "(REBYTE_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY)=(?!YOUR_API_KEY)" .env 2>/dev/null || grep -qE "(REBYTE_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY)=[a-zA-Z0-9]" .env 2>/dev/null; then
    API_OK=true
else
    API_OK=false
    echo "❌ Cần thêm API key vào .env"
fi

if [ "$DOCKER_OK" = true ] && [ "$API_OK" = true ]; then
    echo "✅ Tất cả đã sẵn sàng!"
    echo ""
    echo "🚀 Chạy lệnh sau để start:"
    echo "   docker compose up"
else
    echo "⚠️  Vẫn còn thiếu một số bước"
fi

echo ""

