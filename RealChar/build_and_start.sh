#!/bin/bash

cd "$(dirname "$0")"

echo "🔨 Building backend..."
docker compose build --no-cache backend

echo "🚀 Starting services..."
docker compose up -d

echo "⏳ Waiting for backend to start..."
while true; do
    STATUS=$(docker compose ps backend 2>/dev/null | grep backend | awk '{print $6}')
    if [ "$STATUS" = "Up" ] || [ "$STATUS" = "running" ]; then
        echo "✅ Backend is UP!"
        docker compose ps
        break
    fi
    
    EXIT_CODE=$(docker compose ps backend 2>/dev/null | grep backend | grep -o "Exited ([0-9]*)" | grep -o "[0-9]*")
    if [ ! -z "$EXIT_CODE" ] && [ "$EXIT_CODE" != "0" ]; then
        echo "❌ Backend exited with code $EXIT_CODE. Checking logs..."
        docker compose logs backend | grep -i error | tail -3
        echo "Rebuilding and restarting..."
        docker compose build --no-cache backend
        docker compose up -d backend
    fi
    
    sleep 2
done

echo "🎉 Done! Services:"
docker compose ps

echo ""
echo "🌐 Frontend: http://localhost:3000"

