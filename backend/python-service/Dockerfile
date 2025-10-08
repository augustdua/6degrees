# Dockerfile for Python Connector Service

FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY connector_service.py .

# Copy data directory (relative path from backend)
COPY ../data ./data

# Expose port
EXPOSE 5001

# Set environment variables
ENV PYTHON_SERVICE_PORT=5001
ENV PYTHONUNBUFFERED=1

# Run the service
CMD ["python", "connector_service.py"]
