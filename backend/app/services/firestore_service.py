from google.cloud import firestore
from datetime import datetime, timezone
import uuid
import re


class FirestoreService:
    def __init__(self):
        self.db = firestore.AsyncClient()

    def _format_doc(self, doc_dict: dict) -> dict:
        """
        datetime オブジェクトを JSON シリアライズ可能な ISO 文字列に変換するヘルパー関数
        """
        if "created_at" in doc_dict and isinstance(doc_dict["created_at"], datetime):
            doc_dict["created_at"] = doc_dict["created_at"].isoformat()
        if "updated_at" in doc_dict and isinstance(doc_dict["updated_at"], datetime):
            doc_dict["updated_at"] = doc_dict["updated_at"].isoformat()
        return doc_dict

    async def save_transcription(self, filename: str, result_json: dict) -> str:
        """
        解析された JSON データを Firestore に保存する
        """
        doc_id = str(uuid.uuid4())
        doc_ref = self.db.collection("transcriptions").document(doc_id)
        data = {
            "id": doc_id,
            "filename": filename,
            "status": "completed",
            "raw_text": result_json.get("raw_text", ""),
            "extracted_data": result_json.get("extracted_data", {}),
            "created_at": datetime.now(timezone.utc)
        }
        await doc_ref.set(data)
        return doc_id

    async def save_failed_task(self, filename: str, error: str, gcs_uri: str = "") -> str:
        """
        恒久的エラー（PermanentError）で処理が完了できなかったタスクを記録する。
        Cloud Tasksへのリトライを止める代わりに、失敗内容を追跡できるようにするための保存先。
        """
        doc_id = str(uuid.uuid4())
        doc_ref = self.db.collection("transcriptions").document(doc_id)
        data = {
            "id": doc_id,
            "filename": filename,
            "status": "failed",
            "error": error,
            "gcs_uri": gcs_uri,
            "raw_text": "",
            "extracted_data": {},
            "created_at": datetime.now(timezone.utc)
        }
        await doc_ref.set(data)
        return doc_id

    async def get_documents(self, limit: int = 20) -> list:
        """
        保存済みドキュメント一覧を最新順で取得
        """
        query = self.db.collection("transcriptions").order_by(
            "created_at", direction=firestore.Query.DESCENDING
        ).limit(limit)
        docs = await query.get()
        return [self._format_doc(doc.to_dict()) for doc in docs]

    async def search_documents(self, search_params: dict) -> list:
        """
        指定された複数のパラメータで AND 判定（検索項目間）、部分一致検索、日付範囲指定を実施。
        テキスト項目（機械名、部品名等）の内部は全角・半角スペース区切りで OR（いずれかに一致）判定。
        status を指定した場合、完全一致でそのステータス（completed / failed）のみに絞り込む。
        """
        docs = await self.db.collection("transcriptions").order_by(
            "created_at", direction=firestore.Query.DESCENDING
        ).get()
        results = []
        for doc in docs:
            data = self._format_doc(doc.to_dict())
            extracted = data.get("extracted_data", {})
            if not search_params:
                results.append(data)
                continue
            is_match = True
            doc_date = str(extracted.get("date") or "").strip()
            for key, target_val in search_params.items():
                if not target_val:
                    continue
                target_val_str = str(target_val).strip()

                # --- status フィルタ（新規追加） ---
                # extracted_data 内ではなく、ドキュメント直下の status フィールドを見る
                if key == "status":
                    if str(data.get("status") or "") != target_val_str:
                        is_match = False
                        break

                elif key == "start_date":
                    if not doc_date or doc_date < target_val_str:
                        is_match = False
                        break
                elif key == "end_date":
                    if not doc_date or doc_date > target_val_str:
                        is_match = False
                        break
                elif key == "part_name":
                    keywords = [kw.lower() for kw in re.split(r'\s+', target_val_str) if kw]
                    parts_list = extracted.get("parts_list", [])
                    part_found = False
                    if isinstance(parts_list, list):
                        for part in parts_list:
                            if isinstance(part, dict):
                                name = str(part.get("part_name") or "").lower()
                                if any(kw in name for kw in keywords):
                                    part_found = True
                                    break
                    if not part_found:
                        is_match = False
                        break
                else:
                    field_val = str(extracted.get(key) or "").lower()
                    if key == "date":
                        if target_val_str.lower() not in field_val:
                            is_match = False
                            break
                    else:
                        keywords = [kw.lower() for kw in re.split(r'\s+', target_val_str) if kw]
                        if not any(kw in field_val for kw in keywords):
                            is_match = False
                            break
            if is_match:
                results.append(data)
        return results

    async def update_document(self, doc_id: str, update_data: dict) -> bool:
        """
        指定 IDのドキュメントの内容（extracted_dataなど）を更新する
        """
        doc_ref = self.db.collection("transcriptions").document(doc_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return False

        update_payload = {
            **update_data,
            "updated_at": datetime.now(timezone.utc)
        }
        await doc_ref.update(update_payload)
        return True

    async def delete_document(self, doc_id: str) -> bool:
        """
        指定 IDのドキュメントを削除する
        """
        doc_ref = self.db.collection("transcriptions").document(doc_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return False

        await doc_ref.delete()
        return True


firestore_service = FirestoreService()
