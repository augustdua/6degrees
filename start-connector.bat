@echo off
REM Master start script for Connector game (Windows)

echo ================================
echo   🎮 Connector Game Startup
echo ================================
echo.

REM Start Python service in new window
echo Starting Python service...
start "Python Connector Service" cmd /k "cd backend\python-service && start.bat"

REM Wait a moment for Python service to initialize
echo Waiting for Python service to start...
timeout /t 5 /nobreak > nul

REM Start TypeScript backend in new window
echo Starting TypeScript backend...
start "TypeScript Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to initialize
echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

REM Start frontend in new window
echo Starting frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ================================
echo   ✅ All services started!
echo ================================
echo.
echo Services:
echo   - Python Service: http://localhost:5001
echo   - Backend API: http://localhost:3001
echo   - Frontend: http://localhost:5173
echo.
echo Press any key to close this window (services will keep running)
pause > nul
