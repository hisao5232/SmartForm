from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import ocr

app = FastAPI(title="SmartForm Backend API")

# 2. CORSミドルウェアの追加 (とりあえず全許可)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # すべてのドメインからのリクエストを許可
    allow_credentials=True,
    allow_methods=["*"],            # すべてのHTTPメソッド (GET, POST, OPTIONS etc.) を許可
    allow_headers=["*"],            # すべてのリクエストヘッダーを許可
)

# prefixを追加
app.include_router(ocr.router, prefix="/api/v1/ocr", tags=["ocr"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "SmartForm Backend is running"}
