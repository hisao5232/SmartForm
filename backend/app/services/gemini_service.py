"""
Gemini APIを使ったOCR解析サービス。
スキーマ定義は app/schemas/ocr_schema.py、
正規化・クリーニング処理は app/services/ocr_normalizers.py、
プロンプト文言は app/services/ocr_prompt.py にそれぞれ分割している。
このファイルはGemini呼び出しと全体の流れの制御のみを担う。
"""

import json
from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from app.config import settings
from app.exceptions import PermanentError, TransientError
from app.schemas.ocr_schema import OCRReportResponse
from app.services.ocr_prompt import build_ocr_prompt
from app.services.ocr_normalizers import apply_all_normalizations


class GeminiService:
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = "gemini-3.5-flash-lite"

    async def transcribe_pdf(self, pdf_bytes: bytes) -> dict:
        """
        PDFのバイナリデータを受け取り、指示に従ったJSON構造データ（dict）を返す
        """
        prompt = build_ocr_prompt()
        pdf_part = types.Part.from_bytes(
            data=pdf_bytes,
            mime_type="application/pdf"
        )

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=[pdf_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=OCRReportResponse,
                    temperature=0.1
                )
            )
        except genai_errors.ClientError as e:
            if e.code == 429:
                raise TransientError(f"レート制限に達しました (code={e.code}): {e.message}") from e
            raise PermanentError(f"Geminiへのリクエストが拒否されました (code={e.code}): {e.message}") from e
        except genai_errors.ServerError as e:
            raise TransientError(f"Gemini側で一時的なエラーが発生しました (code={e.code}): {e.message}") from e
        except (TimeoutError, ConnectionError) as e:
            raise TransientError(f"接続エラー: {e}") from e

        try:
            result = json.loads(response.text)
        except (json.JSONDecodeError, AttributeError) as e:
            raise PermanentError(f"Geminiの応答をJSONとして解釈できませんでした: {e}") from e

        # Geminiの出力に頼らず、Python側の正規化・クリーニングで確定させる
        extracted = result.get("extracted_data", {})
        result["extracted_data"] = apply_all_normalizations(extracted)

        return result


gemini_service = GeminiService()
