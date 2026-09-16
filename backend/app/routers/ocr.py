# app/routers/ocr.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from app.services.gemini_service import gemini_service
from app.services.firestore_service import firestore_service
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# 更新リクエスト用データ構造
class UpdateDocumentRequest(BaseModel):
    extracted_data: Optional[Dict[str, Any]] = None
    filename: Optional[str] = None


@router.post("/transcribe-pdf")
async def transcribe_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDFファイルを選択してください。")
    
    pdf_bytes = await file.read()
    
    # Geminiによる解析・構造化
    result_json = await gemini_service.transcribe_pdf(pdf_bytes)
    
    # 日付フィールドのISO 8601形式（YYYY-MM-DD）の確認・変換ガード
    extracted_data = result_json.get("extracted_data", {})
    if extracted_data and extracted_data.get("date"):
        raw_date = extracted_data["date"]
        try:
            # YYYY-MM-DD 形式として解釈可能かチェック
            valid_date = datetime.strptime(raw_date, "%Y-%m-%d").date().isoformat()
            extracted_data["date"] = valid_date
        except (ValueError, TypeError):
            # 万が一フォーマットが崩れていた場合、nullにするかそのまま保持する等の安全処置
            pass

    # Firestoreへ保存
    doc_id = await firestore_service.save_transcription(file.filename, result_json)
    
    return {
        "id": doc_id,
        "filename": file.filename,
        "raw_text": result_json.get("raw_text"),
        "extracted_data": extracted_data
    }


@router.get("/documents")
async def get_documents(limit: int = Query(20, ge=1, le=100)):
    try:
        docs = await firestore_service.get_documents(limit=limit)
        return {"documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_documents(
    date: Optional[str] = Query(None, description="日付ピンポイント (YYYY-MM-DD)"),
    start_date: Optional[str] = Query(None, description="開始日 (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="終了日 (YYYY-MM-DD)"),
    customer: Optional[str] = Query(None, description="顧客名/納入先"),
    machine_name: Optional[str] = Query(None, description="機種/型式"),
    management_no: Optional[str] = Query(None, description="管理番号/機番"),
    repair_staff: Optional[str] = Query(None, description="修理担当者"),
    repair_summary: Optional[str] = Query(None, description="修理概要/症状"),
    part_name: Optional[str] = Query(None, description="使用部品名"),
):
    try:
        search_params = {
            "date": date,
            "start_date": start_date,
            "end_date": end_date,
            "customer": customer,
            "machine_name": machine_name,
            "management_no": management_no,
            "repair_staff": repair_staff,
            "repair_summary": repair_summary,
            "part_name": part_name,
        }
        
        # 安全に str() へ変換してから strip() 処理（None や空文字は除外）
        active_params = {
            k: str(v).strip() 
            for k, v in search_params.items() 
            if v is not None and str(v).strip() != ""
        }
        
        # フィルタリング済みの active_params を渡す
        results = await firestore_service.search_documents(search_params=active_params)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 更新エンドポイント ---
@router.put("/documents/{doc_id}")
async def update_document(doc_id: str, payload: UpdateDocumentRequest):
    """
    PUT /api/v1/ocr/documents/{doc_id}
    指定された ID のドキュメントデータを更新する
    """
    try:
        # Pydantic v2 対応 (v1 の dict() から model_dump() に変更)
        update_data = payload.model_dump(exclude_unset=True)
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


# --- 削除エンドポイント ---
@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """
    DELETE /api/v1/ocr/documents/{doc_id}
    指定された ID のドキュメントを削除する
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
