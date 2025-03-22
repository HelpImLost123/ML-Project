FROM python:3.11-slim

WORKDIR /app

# Install cmake, libgl1, and other necessary build tools
RUN apt-get update && apt-get install -y cmake build-essential libgl1-mesa-glx libglib2.0-0

COPY rq.txt /app/rq.txt
RUN pip install --no-cache-dir -r rq.txt

COPY . /app

COPY face_recognizer.h5 /app/backend/

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app", "--timeout", "10000", "--workers", "4"]