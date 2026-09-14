from fastapi import FastAPI
from app.routers import ocr

app = FastAPI(title="SmartForm Backend API")

# ルートの読み込み
app.include_router(ocr.router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "SmartForm Backend is running"}
