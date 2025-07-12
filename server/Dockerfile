# server/Dockerfile
FROM python:3.10-slim-buster

WORKDIR /app

# Copy dependency files first to leverage Docker cache
COPY ./server/requirements.txt /app/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY ./server/app /app/app
# If you use firebase_admin_key.json file, copy it. Otherwise, rely on env var.
COPY ./server/firebase_admin_key.json /app/firebase_admin_key.json

# Expose the port FastAPI will run on
EXPOSE 8000

# Command to run the application
# Use gunicorn for production deployment with multiple workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# For production, consider using gunicorn:
# CMD ["gunicorn", "app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]