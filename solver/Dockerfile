FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Render uses PORT env variable)
EXPOSE 8001

# Run the application - Render sets PORT env variable
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}