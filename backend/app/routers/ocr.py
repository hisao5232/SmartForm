# app/routers/ocr.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from app.services.gemini_service import gemini_service
from app.services.firestore_service import firestore_service
from typing import Optional, Dict, Any
from pydantic import BaseModel

router = APIRouter()

# 更新リクエスト用データ構造
class UpdateDocumentRequest(BaseModel):
    extracted_data: Optional[Dict[str, Any]] = None
    filename: Optional[str] = None

@router.post("/transcribe-pdf")
async def transcribe_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDFファイルを選択してください。")
    pdf_bytes = await file.read()
    result_json = await gemini_service.transcribe_pdf(pdf_bytes)
    doc_id = await firestore_service.save_transcription(file.filename, result_json)
    return {
        "id": doc_id,
        "filename": file.filename,
        "raw_text": result_json.get("raw_text"),
        "extracted_data": result_json.get("extracted_data")
    }

@router.get("/documents")
async def get_documents(limit: int = Query(20, ge=1, le=100)):
    try:
        docs = await firestore_service.get_documents(limit=limit)
        return {"documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_documents(q: str = Query(..., min_length=1, description="検索キーワード")):
    try:
        results = await firestore_service.search_documents(keyword=q)
        return {"query": q, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 新規追加: 更新エンドポイント ---
@router.put("/documents/{doc_id}")
async def update_document(doc_id: str, payload: UpdateDocumentRequest):
    """
    PUT /api/v1/ocr/documents/{doc_id}
    指定されたIDのドキュメントデータを更新する
    """
    try:
        update_data = payload.dict(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="更新対象のデータがありません")

        success = await firestore_service.update_document(doc_id, update_data)
        if not success:
            raise HTTPException(status_code=404, detail="対象のドキュメントが見つかりません")

        return {"message": "更新が完了しました", "id": doc_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 新規追加: 削除エンドポイント ---
@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """
    DELETE /api/v1/ocr/documents/{doc_id}
    指定されたIDのドキュメントを削除する
    """
    try:
        success = await firestore_service.delete_document(doc_id)
        if not success:
            raise HTTPException(status_code=404, detail="対象のドキュメントが見つかりません")

        return {"message": "削除が完了しました", "id": doc_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
