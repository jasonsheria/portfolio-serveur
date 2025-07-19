#!/bin/bash
# Script pour tester l'endpoint /bot/send de l'API

curl -X POST http://localhost:5000/bot/send \
  -H "Content-Type: application/json" \
  -d '{"message": "Bonjour, peux-tu me prédire la météo ?"}'
