#!/bin/bash

cd "$(dirname "$0")"

echo "🔄 Build Loop - Running until success..."

while true; do
    echo ""
    echo "=== Building backend ==="
    docker compose build backend
    
    echo ""
    echo "=== Starting services ==="
    docker compose up -d
    
    echo ""
    echo "=== Waiting 5 seconds ==="
    sleep 5
    
    echo ""
    echo "=== Checking status ==="
    docker compose ps
    
    BACKEND_UP=$(docker compose ps backend 2>/dev/null | grep backend | grep -q "Up" && echo "yes" || echo "no")
    
    if [ "$BACKEND_UP" = "yes" ]; then
        echo ""
        echo "✅✅✅ SUCCESS! Backend is UP!"
        echo ""
        docker compose ps
        echo ""
        echo "🌐 Frontend: http://localhost:3000"
        break
    else
        echo ""
        echo "❌ Backend not up. Checking logs..."
        docker compose logs backend | tail -5
        echo ""
        echo "🔄 Rebuilding..."
    fi
done

