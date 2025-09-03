#!/bin/bash

echo "🚀 Deploying OpenAI API Lab..."

# Build Docker image
echo "📦 Building Docker image..."
docker build -t openai-api-lab .

# Stop and remove existing container
echo "🛑 Stopping existing container..."
docker stop openai-api-lab 2>/dev/null || true
docker rm openai-api-lab 2>/dev/null || true

# Start new container
echo "▶️ Starting new container..."
docker run -d \
  --name openai-api-lab \
  -p 80:80 \
  --restart unless-stopped \
  openai-api-lab

echo "✅ Deployment complete!"
echo "🌐 Access the application at http://localhost"