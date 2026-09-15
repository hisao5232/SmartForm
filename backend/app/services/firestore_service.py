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

    async def search_documents(self, keyword: str) -> list:
        """
        キーワードでドキュメントを簡易検索
        """
        docs = await self.db.collection("transcriptions").order_by(
            "created_at", direction=firestore.Query.DESCENDING
        ).get()
        results = []
        keyword_lower = keyword.lower()
        for doc in docs:
            data = doc.to_dict()
            filename = data.get("filename", "").lower()
            raw_text = data.get("raw_text", "").lower()
            if keyword_lower in filename or keyword_lower in raw_text:
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

        # 更新日時を追加してアプデ
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
