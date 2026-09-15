# app/ser# app/services/firestore_service.py
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
        キーワードでドキュメントを簡易検索（ファイル名またはテキストに部分一致）
        ※ Firestore単体では全文検索が限定的なため、ここでは一覧から部分一致フィルタを行う例です
        """
        # 件数が少ない場合は全件取得してPython側でフィルタリングするのが手軽です
        # 件数が非常に多い場合は Algolia や Typesense、BigQuery 連携を検討します
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

firestore_service = FirestoreService()

