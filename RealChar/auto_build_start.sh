#!/bin/bash

cd "$(dirname "$0")"

echo "🔄 Auto Build & Start Loop"
echo "=========================="
echo ""

COUNTER=0
MAX_ATTEMPTS=10

while [ $COUNTER -lt $MAX_ATTEMPTS ]; do
    COUNTER=$((COUNTER + 1))
    echo ""
    echo "--- Attempt $COUNTER/$MAX_ATTEMPTS ---"
    echo ""
    
    echo "1. Building backend..."
    docker compose build --no-cache backend
    
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Retrying..."
        continue
    fi
    
    echo ""
    echo "2. Starting services..."
    docker compose up -d
    
    echo ""
    echo "3. Waiting 10 seconds for startup..."
    sleep 10
    
    echo ""
    echo "4. Checking status..."
    docker compose ps
    
    BACKEND_STATUS=$(docker compose ps backend 2>/dev/null | grep backend | awk '{print $6}')
    
    if [ "$BACKEND_STATUS" = "Up" ] || [ "$BACKEND_STATUS" = "running" ]; then
        echo ""
        echo "✅✅✅ SUCCESS! Backend is UP!"
        echo ""
        docker compose ps
        echo ""
        echo "🌐 Frontend: http://localhost:3000"
        echo ""
        echo "📊 Backend logs:"
        docker compose logs backend | tail -10
        exit 0
    else
        echo ""
        echo "❌ Backend not up. Status: $BACKEND_STATUS"
        echo ""
        echo "Error logs:"
        docker compose logs backend 2>/dev/null | grep -i "error\|faster_whisper\|ModuleNotFound" | tail -3
        echo ""
        echo "Retrying..."
    fi
done

echo ""
echo "❌ Failed after $MAX_ATTEMPTS attempts"
exit 1

