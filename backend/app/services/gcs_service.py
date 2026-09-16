from google.cloud import storage
import os

class GCSService:
    def __init__(self):
        self.client = storage.Client()
        self.bucket_name = os.getenv("GCS_BUCKET_NAME", "smartform-app-2026-temp-pdfs")

    async def upload_bytes(self, file_bytes: bytes, blob_name: str) -> str:
        """PDFのバイトデータを GCS にアップロードし、GCS URI を返す"""
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(blob_name)
        blob.upload_from_string(file_bytes, content_type="application/pdf")
        return f"gs://{self.bucket_name}/{blob_name}"

    async def download_bytes(self, gcs_uri: str) -> bytes:
        """GCS URI (gs://bucket/blob) からバイトデータをダウンロードする"""
        # gs://bucket_name/path/to/file からパスを抽出
        path_parts = gcs_uri.replace("gs://", "").split("/", 1)
        bucket_name = path_parts[0]
        blob_name = path_parts[1]

        bucket = self.client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        return blob.download_as_bytes()

    async def delete_file(self, gcs_uri: str):
        """一時保存ファイルを削除する"""
        try:
            path_parts = gcs_uri.replace("gs://", "").split("/", 1)
            bucket = self.client.bucket(path_parts[0])
            blob = bucket.blob(path_parts[1])
            blob.delete()
        except Exception as e:
            print(f"GCS file deletion warning: {e}")

gcs_service = GCSService()
