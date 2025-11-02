#!/bin/bash

echo "🚀 RealChar Auto-Start Script"
echo "=============================="
echo ""

# Check Docker
echo "Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker command không tìm thấy"
    echo "   → Mở Docker Desktop từ Applications"
    exit 1
fi

# Wait for Docker daemon
echo "⏳ Đợi Docker daemon khởi động..."
MAX_WAIT=60
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    if docker ps &> /dev/null; then
        echo "✅ Docker daemon đã sẵn sàng!"
        break
    fi
    
    echo -n "."
    sleep 2
    WAITED=$((WAITED + 2))
done

echo ""

if ! docker ps &> /dev/null; then
    echo "❌ Docker daemon không sẵn sàng sau $MAX_WAIT giây"
    echo ""
    echo "Vui lòng:"
    echo "1. Mở Docker Desktop từ Applications"
    echo "2. Đợi đến khi icon Docker hiển thị 'Docker Desktop is running'"
    echo "3. Chạy lại script này"
    exit 1
fi

# Start RealChar
echo ""
echo "🚀 Đang start RealChar..."
echo ""

cd "$(dirname "$0")"

docker compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ RealChar đã được start thành công!"
    echo ""
    echo "📊 Services đang khởi động (có thể mất 1-2 phút)..."
    echo ""
    echo "🌐 Mở browser sau vài giây:"
    echo "   http://localhost:3000"
    echo ""
    echo "📊 Xem logs:"
    echo "   docker compose logs -f"
    echo ""
    echo "⏹️  Dừng services:"
    echo "   docker compose down"
    echo ""
    echo "✅ Done!"
else
    echo ""
    echo "❌ Có lỗi khi start RealChar"
    echo "   Xem logs: docker compose logs"
    exit 1
fi

