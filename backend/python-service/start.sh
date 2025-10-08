#!/bin/bash

# Start script for Python Connector Service

echo "🐍 Starting Python Connector Service..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Start the service
echo "🚀 Starting Connector service on port 5001..."
python connector_service.py
