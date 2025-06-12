from python:3.13-slim

# Install pgrep (Debian package: procps)
RUN apt-get update && \
    apt-get install -y --no-install-recommends procps && \
    rm -rf /var/lib/apt/lists/*

# set working dir
WORKDIR /app

# install deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy app 
COPY . .

CMD ["python", "app.py"]
