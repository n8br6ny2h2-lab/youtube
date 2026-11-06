FROM python:3.13-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg sqlite3 imagemagick espeak-ng curl ca-certificates \
      gnupg fonts-noto-color-emoji rubberband-cli && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs && npm install -g hyperframes && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && python -m playwright install --with-deps chromium
COPY . .
ENV DASHBOARD_HOST=0.0.0.0 DASHBOARD_PORT=8080 HF_HUB_DISABLE_XET=1
EXPOSE 8080
CMD ["python", "main.py", "--mode", "dashboard"]
