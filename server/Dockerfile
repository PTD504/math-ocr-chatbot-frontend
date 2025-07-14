FROM python:3.10-slim-buster

WORKDIR /app

# Copy dependency files first to leverage Docker cache
COPY ./server/requirements.txt /app/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

COPY ./server/app /app/app
COPY ./server/firebase_admin_key.json /app/firebase_admin_key.json

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
# Use gunicorn for production deployment with multiple workers
# CMD ["gunicorn", "app.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]