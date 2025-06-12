from python:3.13-slim

# set working dir
WORKDIR /app

# install deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy app 
COPY . .

CMD ["python", "app.py"]
