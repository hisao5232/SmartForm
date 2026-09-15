# app/services/firestore_service.py
from google.cloud import firestore
from datetime import datetime, timezone
import uuid

class FirestoreService:
    def __init__(self):
        self.db = firestore.AsyncClient()

    async def save_transcription(self, filename: str, result_json: dict) -> str:
        """
        解析された JSON データを Firestore に保存する
        """
        doc_id = str(uuid.uuid4())
        doc_ref = self.db.collection("transcriptions").document(doc_id)
        data = {
            "id": doc_id,
            "filename": filename,
            "raw_text": result_json.get("raw_text", ""),
            "extracted_data": result_json.get("extracted_data", {}),
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
        return [doc.to_dict() for doc in docs]

    async def search_documents(self, search_params: dict) -> list:
        """
        指定された複数のパラメータでAND（すべて一致）判定・部分一致検索を実施
        """
        docs = await self.db.collection("transcriptions").order_by(
            "created_at", direction=firestore.Query.DESCENDING
        ).get()

        results = []
        for doc in docs:
            data = doc.to_dict()
            extracted = data.get("extracted_data", {})
            
            # 検索条件が指定されていない場合は全件返す
            if not search_params:
                results.append(data)
                continue

            is_match = True

            # 指定された全ての条件で検証 (AND検索)
            for key, target_val in search_params.items():
                target_val_lower = target_val.lower()

                # 使用部品名 (parts_list の配列内をチェック)
                if key == "part_name":
                    parts_list = extracted.get("parts_list", [])
                    part_found = False
                    if isinstance(parts_list, list):
                        for part in parts_list:
                            if isinstance(part, dict):
                                name = str(part.get("part_name", "")).lower()
                                if target_val_lower in name:
                                    part_found = True
                                    break
                    if not part_found:
                        is_match = False
                        break

                # 通常のフィールド (date, customer, machine_name, management_no, repair_staff, repair_summary)
                else:
                    field_val = str(extracted.get(key, "")).lower()
                    if target_val_lower not in field_val:
                        is_match = False
                        break

            if is_match:
                results.append(data)

        return results

    async def update_document(self, doc_id: str, update_data: dict) -> bool:
        """
        指定IDのドキュメントの内容（extracted_dataなど）を更新する
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
        指定IDのドキュメントを削除する
        """
        doc_ref = self.db.collection("transcriptions").document(doc_id)
        doc = await doc_ref.get()
        if not doc.exists:
            return False

        await doc_ref.delete()
        return True

firestore_service = FirestoreService()
