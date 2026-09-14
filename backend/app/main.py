from fastapi import FastAPI
from app.routers import ocr

app = FastAPI(title="SmartForm Backend API")

# prefixを追加
app.include_router(ocr.router, prefix="/api/v1/ocr", tags=["ocr"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "SmartForm Backend is running"}
    