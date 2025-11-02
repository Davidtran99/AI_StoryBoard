#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Quick Start - RealChar"
echo "========================"
echo ""

# Check Docker
if ! docker ps >/dev/null 2>&1; then
    echo "⚠️  Docker daemon not running"
    echo "📱 Opening Docker Desktop..."
    open -a Docker
    
    echo ""
    echo "⏳ Waiting for Docker to start..."
    echo "   (Check Docker Desktop icon in menu bar)"
    
    while ! docker ps >/dev/null 2>&1; do
        sleep 2
        echo -n "."
    done
    
    echo ""
    echo "✅ Docker is running!"
    echo ""
fi

echo "🔨 Building backend..."
docker compose build --no-cache backend

if [ $? -eq 0 ]; then
    echo ""
    echo "🚀 Starting services..."
    docker compose up -d
    
    echo ""
    echo "⏳ Waiting 10 seconds..."
    sleep 10
    
    echo ""
    echo "📊 Status:"
    docker compose ps
    
    echo ""
    echo "🌐 Frontend: http://localhost:3000"
    echo ""
    echo "✅ Done!"
else
    echo ""
    echo "❌ Build failed. Check logs above."
    exit 1
fi

