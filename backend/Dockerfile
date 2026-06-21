FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend backend
COPY public public
COPY images images

WORKDIR /app/backend

ENV PORT=3000
EXPOSE 3000

CMD ["python", "app.py"]
