import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List, Optional
from app.config import settings

# --- 出力用レスポンススキーマの定義 ---
class PartItem(BaseModel):
    part_name: Optional[str] = Field(default=None, description="品名・部品名")
    quantity: Optional[str] = Field(default=None, description="数量・個数")
    category: Optional[str] = Field(default=None, description="仕入先・仕入区分・分類")
    amount: Optional[str] = Field(default=None, description="単価または金額")

class ExtractedData(BaseModel):
    report_no: Optional[str] = Field(default=None, description="日報No (例: A-101160)")
    receipt_no: Optional[str] = Field(default=None, description="修理受品書No (例: 12345)")
    date: Optional[str] = Field(
        default=None, 
        description="日付。和暦・西暦問わず必ず ISO 8601 形式の 'YYYY-MM-DD' に変換して出力 (例: 2026-09-08)"
    )
    customer: Optional[str] = Field(default=None, description="得意先名")
    billing_to: Optional[str] = Field(default=None, description="請求先")
    site_name: Optional[str] = Field(default=None, description="現場名")
    machine_name: Optional[str] = Field(default=None, description="機械名 (例: RX306)")
    management_no: Optional[str] = Field(default=None, description="管理番号")
    hour_meter: Optional[str] = Field(default=None, description="アワーメーター")
    repair_staff: Optional[str] = Field(default=None, description="修理担当者名")
    repair_summary: Optional[str] = Field(default=None, description="修理内容・作業概要 (例: 特定自主点検)")
    work_time: Optional[str] = Field(default=None, description="工賃の作業時間 (例: 1H30M)")
    travel_time: Optional[str] = Field(default=None, description="出張費の作業時間・移動時間 (例: 1H30M)")
    mileage: Optional[str] = Field(default=None, description="走行距離 (例: 10km)")
    total_amount: Optional[str] = Field(default=None, description="請求金額")
    parts_list: List[PartItem] = Field(default_factory=list, description="使用部品のリスト")
    total_parts_amount: Optional[str] = Field(
        default=None, 
        description="使用部品代金合計 (各部品の金額×数量を合計した金額)"
    )
    other_notes: Optional[str] = Field(default=None, description="枠外メモ、特記事項、指示内容などの全記載事項")

class OCRReportResponse(BaseModel):
    raw_text: str = Field(description="帳票全体の転記テキスト。読取順に改行区切りで出力")
    extracted_data: ExtractedData


class GeminiService:
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_name = "gemini-3.5-flash-lite"

    async def transcribe_pdf(self, pdf_bytes: bytes) -> dict:
        """
        PDFのバイナリデータを受け取り、指示に従ったJSON構造データ（dict）を返す
        """
        prompt = """
添付された建設機械の修理報告書/日報（画像またはPDF）を解析し、手書き文字を含めて以下の指示に従ってデータを抽出してください。

【抽出・変換ルール】
- 日付（date）は、帳票上の表記が和暦（例: 令和8年9月8日、R8.9.8）や日本語表記（例: 2026年9月8日）であっても、必ず「YYYY-MM-DD」形式のISO 8601標準文字列に正規化・変換して出力してください。年が省略されている場合は文脈や他の記載から補完してください。
- raw_text には、帳票に書かれているすべての文字（活字・手書き問わず）を読み取ったそのままの全文テキストを改行区切りで出力してください。
- extracted_data 内の略称や崩し文字（例：「特自ン」→「特定自主点検」）は、文脈から正しい標準表記に修正して抽出してください。
- 工賃・出張時間の単位（例: 1H30M）や走行距離（例: 10km）などの単位付き手書き文字も正確に抽出してください。
- 使用部品代金合計 (total_parts_amount) は、パーツリストの（金額 × 数量）を計算・集計して出力してください。明確な記載がある場合はその値を優先しても構いません。
- 帳票内のすべての手書き文字・数字を漏らさず拾い上げてください。
- 該当する記載がない項目は null にしてください。
"""
        pdf_part = types.Part.from_bytes(
            data=pdf_bytes,
            mime_type="application/pdf"
        )
        
        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=[pdf_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=OCRReportResponse,  # 構造化出力を厳格に強制
                temperature=0.1  # 読み取り精度を高めるため温度を低めに設定
            )
        )
        return json.loads(response.text)

gemini_service = GeminiService()
