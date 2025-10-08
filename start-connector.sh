#!/bin/bash

# Master start script for Connector game (Mac/Linux)

echo "================================"
echo "  🎮 Connector Game Startup"
echo "================================"
echo ""

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $PYTHON_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start Python service
echo "Starting Python service..."
cd backend/python-service
bash start.sh &
PYTHON_PID=$!
cd ../..

# Wait for Python service to initialize
echo "Waiting for Python service to start..."
sleep 5

# Start TypeScript backend
echo "Starting TypeScript backend..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to initialize
echo "Waiting for backend to start..."
sleep 3

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "================================"
echo "  ✅ All services started!"
echo "================================"
echo ""
echo "Services:"
echo "  - Python Service: http://localhost:5001"
echo "  - Backend API: http://localhost:3001"
echo "  - Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
wait
