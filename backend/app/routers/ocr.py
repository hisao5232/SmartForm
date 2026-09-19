from fastapi import APIRouter, UploadFile, File, HTTPException, Query, status
from app.services.gemini_service import gemini_service
from app.services.firestore_service import firestore_service
from app.services.gcs_service import gcs_service
from app.services.tasks_service import tasks_service
from app.exceptions import PermanentError, TransientError  # ← 追加
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import uuid
import logging

router = APIRouter()

# 更新リクエスト用データ構造
class UpdateDocumentRequest(BaseModel):
    extracted_data: Optional[Dict[str, Any]] = None
    filename: Optional[str] = None

# Cloud Tasks ペイロード用データ構造
class TaskPayload(BaseModel):
    gcs_uri: str
    filename: str
    task_id: str


# --- 1. 非同期受付エンドポイント（フロントエンドから呼び出し） ---
@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_pdf(file: UploadFile = File(...)):
    """
    PDFをGCSに一時保存し、Cloud Tasksにタスクを投入して即座に完了レスポンスを返す
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDFファイルを選択してください。")

    try:
        task_id = str(uuid.uuid4())
        blob_name = f"temp/{task_id}_{file.filename}"

        pdf_bytes = await file.read()
        gcs_uri = await gcs_service.upload_bytes(pdf_bytes, blob_name)

        await tasks_service.create_ocr_task(gcs_uri=gcs_uri, filename=file.filename, task_id=task_id)

        return {
            "status": "accepted",
            "message": "PDFのアップロードが完了しました。バックグラウンドで解析処理中です。",
            "task_id": task_id,
            "filename": file.filename
        }
    except Exception as e:
        logging.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ファイル受領処理に失敗しました: {str(e)}")


# --- 2. バックグラウンドワーカーエンドポイント（Cloud Tasks から呼び出し） ---
@router.post("/process-task")
async def process_ocr_task(payload: TaskPayload):
    """
    Cloud Tasks から実行されるバックグラウンド処理。
    GCSからPDFを取得し、Geminiで解析してFirestoreに保存する。

    エラー分類方針:
    - PermanentError（モデル404、認証エラーなど）→ 200を返してCloud Tasksのリトライを止める
    - TransientError（429、5xx、接続エラーなど）→ 500を返してCloud Tasksにリトライさせる
    - 未分類の例外 → 安全側に倒して500（リトライさせる）
    """
    try:
        # 1. GCS から PDF バイトデータをダウンロード
        pdf_bytes = await gcs_service.download_bytes(payload.gcs_uri)

        # 2. Gemini による解析・構造化（ここで PermanentError / TransientError が飛んでくる）
        result_json = await gemini_service.transcribe_pdf(pdf_bytes)

        # 3. 日付フィールドのISO 8601形式（YYYY-MM-DD）の確認・変換ガード
        extracted_data = result_json.get("extracted_data", {})
        if extracted_data and extracted_data.get("date"):
            raw_date = extracted_data["date"]
            try:
                valid_date = datetime.strptime(str(raw_date), "%Y-%m-%d").date().isoformat()
                extracted_data["date"] = valid_date
            except (ValueError, TypeError):
                pass

        # 4. Firestore へ保存
        doc_id = await firestore_service.save_transcription(payload.filename, result_json)

        # 5. 一時保存した GCS ファイルの削除（クリーンアップ）
        await gcs_service.delete_file(payload.gcs_uri)

        return {
            "status": "success",
            "doc_id": doc_id,
            "filename": payload.filename
        }

    except PermanentError as e:
        # 恒久的な失敗（モデル404、認証エラーなど）
        # → リトライしても直らないので、200を返してCloud Tasksを終了させる
        logging.error(f"[PERMANENT] Task processing failed for {payload.filename}: {e}")
        try:
            await firestore_service.save_failed_task(
                filename=payload.filename,
                error=str(e),
                gcs_uri=payload.gcs_uri,
            )
        except Exception as save_err:
            # 失敗記録の保存自体が失敗しても、リトライループには入れたくないのでログのみ
            logging.error(f"Failed to save failure record for {payload.filename}: {save_err}")

        # GCSの一時ファイルは溜め込まずに削除
        await gcs_service.delete_file(payload.gcs_uri)

        return {
            "status": "permanent_failure",
            "filename": payload.filename,
            "detail": str(e)
        }  # 200 OK: Cloud Tasksに「完了」と伝える

    except TransientError as e:
        # 一時的な失敗（429, 5xx, 接続エラーなど）
        # → 500を返してCloud Tasksにリトライさせる
        logging.warning(f"[TRANSIENT] Task processing failed for {payload.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"一時的な処理エラー: {str(e)}")

    except Exception as e:
        # 未分類のエラー → 安全側に倒してリトライ対象にする
        logging.error(f"[UNKNOWN] Task processing failed for {payload.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OCR解析・保存処理に失敗しました: {str(e)}")


# --- 既存のエンドポイント（変更なし） ---

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
    customer_type: Optional[str] = Query(None, description="得意先区分 (own_lease / client)"),  # ← 追加
    machine_name: Optional[str] = Query(None, description="機種/型式"),
    management_no: Optional[str] = Query(None, description="管理番号/機番"),
    repair_staff: Optional[str] = Query(None, description="修理担当者"),
    repair_summary: Optional[str] = Query(None, description="修理概要/症状"),
    part_name: Optional[str] = Query(None, description="使用部品名"),
    part_no: Optional[str] = Query(None, description="部品番号"),      # ← 追加
    supplier: Optional[str] = Query(None, description="部品提供先"),   # ← 追加
    status: Optional[str] = Query(None, description="処理ステータス (completed / failed)"),
):
    try:
        search_params = {
            "date": date,
            "start_date": start_date,
            "end_date": end_date,
            "customer": customer,
            "customer_type": customer_type,
            "machine_name": machine_name,
            "management_no": management_no,
            "repair_staff": repair_staff,
            "repair_summary": repair_summary,
            "part_name": part_name,
            "part_no": part_no,      # ← 追加
            "supplier": supplier,    # ← 追加
            "status": status,  # ← 追加
        }

        active_params = {
            k: str(v).strip()
            for k, v in search_params.items()
            if v is not None and str(v).strip() != ""
        }

        results = await firestore_service.search_documents(search_params=active_params)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/documents/{doc_id}")
async def update_document(doc_id: str, payload: UpdateDocumentRequest):
    try:
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


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    try:
        success = await firestore_service.delete_document(doc_id)
        if not success:
            raise HTTPException(status_code=404, detail="対象のドキュメントが見つかりません")
        return {"message": "削除が完了しました", "id": doc_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
