# app/services/firestore_service.py
from google.cloud import firestore
from datetime import datetime, timezone
import uuid

class FirestoreService:
    def __init__(self):
        self.db = firestore.AsyncClient()

    async def save_transcription(self, filename: str, result_json: dict) -> str:
        """
        解析されたJSONデータを Firestore に保存する
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

firestore_service = FirestoreService()
