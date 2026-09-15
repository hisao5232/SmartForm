# app/routers/ocr.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from app.services.gemini_service import gemini_service
from app.services.firestore_service import firestore_service
from typing import Optional

router = APIRouter()

@router.post("/transcribe-pdf")
async def transcribe_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDFファイルを選択してください。")
    pdf_bytes = await file.read()
    # 1. Geminiで JSON構造化抽出
    result_json = await gemini_service.transcribe_pdf(pdf_bytes)
    # 2. Firestoreへ保存
    doc_id = await firestore_service.save_transcription(file.filename, result_json)
    return {
        "id": doc_id,
        "filename": file.filename,
        "raw_text": result_json.get("raw_text"),
        "extracted_data": result_json.get("extracted_data")
    }

# --- 追加するエンドポイント ---

@router.get("/documents")
async def get_documents(limit: int = Query(20, ge=1, le=100)):
    """
    GET /api/v1/ocr/documents
    Firestoreからドキュメント一覧を取得する
    """
    try:
        docs = await firestore_service.get_documents(limit=limit)
        return {"documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_documents(q: str = Query(..., min_length=1, description="検索キーワード")):
    """
    GET /api/v1/ocr/search?q=キーワード
    Firestore内のドキュメントを検索する
    """
    try:
        results = await firestore_service.search_documents(keyword=q)
        return {"query": q, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

