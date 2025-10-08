@echo off
REM Start script for Python Connector Service (Windows)

echo 🐍 Starting Python Connector Service...

REM Check if virtual environment exists
if not exist "venv\" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/update dependencies
echo 📥 Installing dependencies...
pip install -r requirements.txt

REM Start the service
echo 🚀 Starting Connector service on port 5001...
python connector_service.py
