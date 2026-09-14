# app/services/firestore_service.py
from google.cloud import firestore
from datetime import datetime, timezone
import uuid

class FirestoreService:
    def __init__(self):
        # Cloud Run 上でデフォルトのプロジェクト ID を自動認識
        self.db = firestore.AsyncClient()

    async def save_transcription(self, filename: str, text: str) -> str:
        """
        文字起こし結果を Firestore の 'transcriptions' コレクションに保存する
        """
        doc_id = str(uuid.uuid4())
        doc_ref = self.db.collection("transcriptions").document(doc_id)

        data = {
            "id": doc_id,
            "filename": filename,
            "transcription": text,
            "created_at": datetime.now(timezone.utc)
        }

        await doc_ref.set(data)
        return doc_id

firestore_service = FirestoreService()
