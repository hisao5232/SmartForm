from google import genai
from google.genai import types
from app.config import settings

class GeminiService:
    def __init__(self):
        # APIキーを設定してクライアントを初期化
        # http_options で retry 機能を無効化（1回失敗したら即エラーにする）
        self.client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options={'api_version': 'v1alpha'} # 必要に応じて指定
        )
        self.model_name = "gemini-3.5-flash-lite"

    async def transcribe_pdf(self, pdf_bytes: bytes) -> str:
        """
        PDFのバイナリデータを受け取り、全文文字起こし結果を返す
        """
        prompt = "添付されたPDFファイル内の見えている文字を、省略せず全文出力してください。"

        # inline_dataでPDFのバイト列を直接指定
        pdf_part = types.Part.from_bytes(
            data=pdf_bytes,
            mime_type="application/pdf"
        )

        # 非同期 API (client.aio) を使用し、http_options でリトライ回数を 0 に設定
        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=[pdf_part, prompt],
            config=types.GenerateContentConfig(
                # 必要に応じてシステムプロンプトや安全設定を追加
            )
        )

        return response.text

gemini_service = GeminiService()
