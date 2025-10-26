FROM dailyco/pipecat-base:latest

# Install Python package deps (keeps control over versions and adds any extras)
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy application code
COPY bot.py bot.py
COPY processors/ processors/

# The base image provides the correct entrypoint for Pipecat Cloud
