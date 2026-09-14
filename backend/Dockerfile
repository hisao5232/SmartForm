FROM python:3.11-slim

WORKDIR /app

# 依存ライブラリのインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ソースコードのコピー
COPY . .

# FastAPI (uvicorn) の起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
