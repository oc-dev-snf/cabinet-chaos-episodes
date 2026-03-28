FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install piper binary (packaged build expected in PATH as "piper")
RUN curl -L -o /tmp/piper.tar.gz https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_linux_x86_64.tar.gz \
  && mkdir -p /opt/piper \
  && tar -xzf /tmp/piper.tar.gz -C /opt/piper --strip-components=1 \
  && ln -s /opt/piper/piper /usr/local/bin/piper \
  && rm /tmp/piper.tar.gz

COPY app.py /app/app.py

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
