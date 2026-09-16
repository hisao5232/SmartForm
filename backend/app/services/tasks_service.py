from google.cloud import tasks_v2
import json
import os

class TasksService:
    def __init__(self):
        self.client = tasks_v2.CloudTasksClient()
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "smartform-app-2026")
        self.location = "asia-northeast1"
        self.queue_name = "ocr-processing-queue"
        # バックエンドの Cloud Run URL
        self.backend_url = os.getenv(
            "BACKEND_URL",
            "https://smartform-backend-416426508758.asia-northeast1.run.app"
        )

    async def create_ocr_task(self, gcs_uri: str, filename: str, task_id: str):
        """Cloud Tasks に OCR 処理タスクを投入する"""
        parent = self.client.queue_path(self.project_id, self.location, self.queue_name)
        
        url = f"{self.backend_url}/api/v1/ocr/process-task"
        payload = {
            "gcs_uri": gcs_uri,
            "filename": filename,
            "task_id": task_id
        }

        task = {
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": url,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(payload).encode(),
            }
        }

        response = self.client.create_task(request={"parent": parent, "task": task})
        return response.name

tasks_service = TasksService()
