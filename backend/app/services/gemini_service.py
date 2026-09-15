from google import genai
from google.genai import types
import json
from app.config import settings

class GeminiService:
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = "gemini-2.5-flash"

    async def transcribe_pdf(self, pdf_bytes: bytes) -> dict:
        """
        PDFのバイナリデータを受け取り、プロンプトに従ったJSON構造データ（dict）を返す
        """
        prompt = """
        添付された建設機械の修理報告書/日報（画像またはPDF）を解析し、手書き文字を含めて以下の指示に従って厳密なJSON形式で出力してください。

        【出力フォーマット】
        {
          "raw_text": "帳票に書かれているすべての文字（活字・手書き問わず）を読み取ったそのままの全文テキスト。読み取り順に改行区切りで出力。",
          "extracted_data": {
            "report_no": "日報No (例: A-101160)",
            "receipt_no": "修理受品書No. (例: 12345)",
            "date": "日付 (例: 2026-09-08 または 2026年9月8日)",
            "customer": "得意先名",
            "billing_to": "請求先",
            "site_name": "現場名",
            "machine_name": "機械名 (例: RX306)",
            "management_no": "管理番号",
            "hour_meter": "アワーメーター",
            "repair_staff": "修理担当者名",
            "repair_summary": "修理内容・作業概要 (例: 特定自主点検)",
            "work_time": "工賃の作業時間 (例: 1H30M)",
            "travel_time": "出張費の作業時間・移動時間 (例: 1H30M)",
            "mileage": "走行距離 (例: 10km)",
            "total_amount": "請求金額",
            "parts_list": [
              {
                "part_name": "品名・部品名",
                "quantity": "数量・個数",
                "category": "仕入先・仕入区分・分類",
                "amount": "単価または金額"
              }
            ],
            "total_parts_amount": "使用部品代金合計 (各部品の金額×数量を合計した金額。数値またはカンマ付き数値など)",
            "other_notes": "上記項目以外の枠外メモ、特記事項、指示内容など、帳票内のすべての記載事項"
          }
        }

        【読み取り時の注意事項】
        - 日付（例: 2026年9月8日）は、見つかった表記通りに読み取ってください。
        - 工賃や出張費の時間表現（例: 1H30M）や走行距離（例: 10km）などの単位付き手書き文字も正確に抽出してください。
        - 略称や崩し文字（例: 「特自ン」→「特定自主点検」）は、文脈から正しい表記に補正して読み取ってください。
        - 使用部品代金合計 (total_parts_amount) は、パーツリストの（金額 × 数量）を計算・集計して出力してください。明確な記載がある場合はその値を採用しても構いません。
        - 帳票内のすべての手書き文字・数字を漏らさず拾い上げてください。
        - 該当する記載がない項目は null または空文字にしてください。
        """

        pdf_part = types.Part.from_bytes(
            data=pdf_bytes,
            mime_type="application/pdf"
        )

        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=[pdf_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        return json.loads(response.text)

gemini_service = GeminiService()
