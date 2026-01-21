#!/bin/bash

# 🚀 Script per avviare i container Docker DEV
# Uso: ./start-dev.sh

echo "🐳 Avvio container Docker DEV..."
echo ""

cd backend
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "✅ Container DEV avviati!"
echo ""
echo "📊 Stato container:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔗 Servizi disponibili:"
echo "   - Backend API: http://localhost:8001"
echo "   - WebSocket: ws://localhost:8001/ws"
echo "   - Database: localhost:5433"
echo "   - MQTT: localhost:1884"
echo ""
echo "📝 Log backend: docker logs -f escape-backend-dev"
echo "🛑 Stop: cd backend && docker-compose -f docker-compose.dev.yml down"
