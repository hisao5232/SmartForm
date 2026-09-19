import json
import re
import difflib
from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from pydantic import BaseModel, Field
from typing import List, Optional
from app.config import settings
from app.exceptions import PermanentError, TransientError

# 自社リース機の正式名称一覧（読み間違い補正の基準）
KNOWN_LEASE_NAMES = [
    "厚木リース機",
    "相模原リース機",
    "大和リース機",
    "町田リース機",
    "双葉リース機",
]

# --- 出力用レスポンススキーマの定義 ---
class PartItem(BaseModel):
    part_name: Optional[str] = Field(
        default=None,
        description="使用部品（品名）。欄に「〃」（ノノ字点）、「↓」などの矢印、縦の罫線など"
                    "「上の段と同じ」を意味する記号が書かれている場合は、その記号ではなく、"
                    "実際の値が記載されている直近の上の段まで遡って同じ値を採用する"
                    "この矢印や罫線は1行だけでなく、複数行にわたって連続して伸びている場合がある。"
                    "その場合は、矢印が指している範囲に含まれる行すべてに対して、同じ実際の値を繰り返し適用する。"
                    "値が読み取れない、または記載が無い場合は文字列の'-'ではなく必ずnullを出力する"
    )
    part_no: Optional[str] = Field(
        default=None,
        description="部品番号。欄に「〃」（ノノ字点）、「↓」などの矢印、縦の罫線など"
                    "「上の段と同じ」を意味する記号が書かれている場合は、その記号ではなく、"
                    "実際の値が記載されている直近の上の段まで遡って同じ値を採用する"
                    "この矢印や罫線は1行だけでなく、複数行にわたって連続して伸びている場合がある。"
                    "その場合は、矢印が指している範囲に含まれる行すべてに対して、同じ実際の値を繰り返し適用する。"
                    "値が読み取れない、または記載が無い場合は文字列の'-'ではなく必ずnullを出力する"
    )
    quantity: Optional[str] = Field(
        default=None,
        description="個数。数字の後にリットルを表す単位記号（L, l, ℓ, リットル等)が付いている場合は、"
                    "数字部分のみを抽出し単位記号は完全に取り除く（例: '7ℓ' → '7', '7L' → '7'）。"                    
    )
    purchase_amount: Optional[str] = Field(
        default=None,
        description="仕入金額。欄に「×190 1330」のように「×(数字A) (数字B)」の形式で2つの数字が並んでいる場合、"
                    "必ず×の直後にある数字A（単価）を抽出する。数字B（数字Aとの掛け算の結果である合計額）は抽出しない。"
                    "×記号が無く単一の金額のみが記載されている場合はその値をそのまま抽出する。"
                    "欄に「〃」（ノノ字点）、「↓」などの矢印、縦の罫線など「上の段と同じ」を意味する"
                    "記号が書かれている場合は、その記号ではなく、実際の値が記載されている直近の"
                    "上の段まで遡って同じ値を採用する"
    )
    billing_amount: Optional[str] = Field(
        default=None,
        description="請求金額。欄に「〃」（ノノ字点）、「↓」などの矢印、縦の罫線など"
                    "「上の段と同じ」を意味する記号が書かれている場合は、その記号ではなく、"
                    "実際の値が記載されている直近の上の段まで遡って同じ値を採用する"
    )
    supplier: Optional[str] = Field(
        default=None,
        description="部品提供先。表内に「在」という文字がデフォルトで入っている場合は、それを除いた実際の提供先名のみを抽出する（「在」のみの場合はnullとする）。"
                    "欄に「〃」（ノノ字点）、「↓」などの矢印、縦の罫線など「上の段と同じ」を意味する記号が書かれている場合は、"
                    "その記号ではなく、実際の値が記載されている直近の上の段まで遡って同じ値を採用する。"
                    "この矢印や罫線は1行だけでなく、複数行にわたって連続して伸びている場合がある。"
                    "その場合は、矢印が指している範囲に含まれる行すべてに対して、同じ実際の値を繰り返し適用する。"
                    "値が読み取れない、または記載が無い場合は文字列の'-'ではなく必ずnullを出力する"
    )

class ExtractedData(BaseModel):
    report_no: Optional[str] = Field(default=None, description="日報No (例: A-101160)")
    receipt_no: Optional[str] = Field(default=None, description="修理受品書No (例: 12345)")
    date: Optional[str] = Field(
        default=None, 
        description="日付。和暦・西暦問わず必ず ISO 8601 形式の 'YYYY-MM-DD' に変換して出力 (例: 2026-09-08)"
    )
    customer: Optional[str] = Field(
        default=None,
        description="得意先名。自社のリース機である場合は「厚木リース機」「相模原リース機」「大和リース機」"
                    "「町田リース機」「双葉リース機」のいずれかの正式名称に必ず正規化して出力する"
                    "（例: 「厚木リース器」「厚木リ-ス機」「厚木リ―ス機」等の読み取りゆれは"
                    "すべて「厚木リース機」に統一する。特に「機」の字は「器」「木」「株」等に誤読されやすいため注意する）。"
                    "「相模リース機」「相リース機」は「相模原リース機」として出力する"
                    "これらの自社リース機のいずれにも該当しない場合は、先方（得意先企業）の会社名をそのまま出力する"
    )
    customer_type: Optional[str] = Field(
        default=None,
        description="customerが自社のリース機（厚木リース機/相模原リース機/大和リース機/町田リース機/双葉リース機）"
                    "のいずれかである場合は 'own_lease' を出力し、それ以外（先方企業の機械）の場合は 'client' を出力する"
    )
    billing_to: Optional[str] = Field(default=None, description="請求先")
    site_name: Optional[str] = Field(default=None, description="現場名")
    machine_name: Optional[str] = Field(default=None, description="機械名 (例: RX306)")
    management_no: Optional[str] = Field(default=None, description="管理番号")
    hour_meter: Optional[str] = Field(default=None, description="アワーメーター")
    repair_staff: Optional[str] = Field(default=None, description="修理担当者名")
    repair_summary: Optional[str] = Field(default=None, description="修理内容・作業概要 (例: 特定自主点検)")
    work_time: Optional[str] = Field(
        default=None,
        description="工賃の作業時間。'H30M'のように時間の数字が空欄の場合はHを省略して'30M'として出力し、"
                    "'2H M'のように分の数字が空欄の場合は'2H0M'として出力する（例: 1H30M, 30M, 2H0M）"
    )
    work_time_minutes: Optional[int] = Field(
        default=None,
        description="work_time を分単位に変換した数値（集計用）。この値はGeminiではなくPython側で計算するため、出力しなくてよい"
    )
    travel_time: Optional[str] = Field(
        default=None,
        description="出張費の作業時間・移動時間。'H30M'のように時間の数字が空欄の場合はHを省略して'30M'として出力し、"
                    "'2H M'のように分の数字が空欄の場合は'2H0M'として出力する（例: 1H30M, 30M, 2H0M）"
    )
    travel_time_minutes: Optional[int] = Field(
        default=None,
        description="travel_time を分単位に変換した数値（集計用）。この値はGeminiではなくPython側で計算するため、出力しなくてよい"
    )
    mileage: Optional[str] = Field(default=None, description="走行距離 (例: 10km)")
    total_amount: Optional[str] = Field(default=None, description="請求金額")
    parts_list: List[PartItem] = Field(default_factory=list, description="使用部品のリスト")
    total_purchase_amount: Optional[str] = Field(
        default=None,
        description="部品仕入合計 (各部品の仕入金額×個数を合計した金額)"
    )
    total_billing_amount: Optional[str] = Field(
        default=None,
        description="部品請求合計 (各部品の請求金額×個数を合計した金額)"
    )
    other_notes: Optional[str] = Field(default=None, description="枠外メモ、特記事項、指示内容などの全記載事項")

class OCRReportResponse(BaseModel):
    raw_text: str = Field(description="帳票全体の転記テキスト。読取順に改行区切りで出力")
    extracted_data: ExtractedData


def parse_time_to_minutes(time_str: Optional[str]) -> Optional[int]:
    """
    "1H30M", "30M", "2H0M", "2H" のような時間表記を分単位の整数に変換する。
    H(時間)・M(分)を文字列内のどこにあっても個別に検索するので、
    どちらか一方が欠けている表記でも解釈できる。
    """
    if not time_str:
        return None

    hour_match = re.search(r'(\d+)\s*[Hh]', time_str)
    minute_match = re.search(r'(\d+)\s*[Mm]', time_str)

    if not hour_match and not minute_match:
        return None

    hours = int(hour_match.group(1)) if hour_match else 0
    minutes = int(minute_match.group(1)) if minute_match else 0
    return hours * 60 + minutes


def clean_quantity(value: Optional[str]) -> Optional[str]:
    """
    "7ℓ", "7L", "7l" のような個数表記から、末尾に付く単位を取り除き数字のみを残す。
    数字が見つからない場合は元の値をそのまま返す（想定外フォーマットを握りつぶさないため）。
    """
    if not value:
        return value
    match = re.match(r'\s*([\d,.]+)', str(value))
    return match.group(1) if match else value


def clean_purchase_amount(value: Optional[str]) -> Optional[str]:
    """
    "×190 1330" のような「×単価 合計」表記から単価側のみを取り出す。
    ×が無い場合は元の値をそのまま返す。
    """
    if not value:
        return value
    match = re.search(r'[×x]\s*([\d,.]+)', str(value))
    return match.group(1) if match else value

def fill_down_supplier(parts_list: list) -> list:
    """
    supplierが空欄（None/空文字）の行に対して、直前に実際の値があった行のsupplierを補完する。
    「〃」「↓」等の記号によって上の段の値を継承する表記を、Geminiが読み落とした場合の保険。
    部品提供先が空欄になることは運用上ほぼ無いため、この補完を適用する。
    """
    last_value = None
    for part in parts_list:
        if not isinstance(part, dict):
            continue
        current = part.get("supplier")
        if current:
            last_value = current
        elif last_value:
            part["supplier"] = last_value
    return parts_list

def normalize_customer(value: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    """
    customerの値を既知の自社リース機名リストと比較し、近似していれば正式名称に補正する。
    戻り値: (正規化後のcustomer, customer_type)
    customer_typeは 'own_lease'（自社リース機）または 'client'（先方企業）。
    """
    if not value:
        return value, None

    value = value.strip()

    # 完全一致ならそのまま
    if value in KNOWN_LEASE_NAMES:
        return value, "own_lease"

    # 近似マッチ（読み間違い・OCRゆれを補正）
    # cutoff=0.6 は緩めの類似度閾値。厚木リース機 と 厚木リース器 などは高い類似度になる
    matches = difflib.get_close_matches(value, KNOWN_LEASE_NAMES, n=1, cutoff=0.6)
    if matches:
        return matches[0], "own_lease"

    # 「リース機」という語を含んでいるが上記5拠点に一致しない場合は、
    # 未知の拠点名の可能性があるため補正せずそのまま返す（customer_typeはown_lease扱い）
    if "リース機" in value or "リース器" in value:
        return value, "own_lease"

    # それ以外は先方企業として扱う
    return value, "client"

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
- raw_text には、帳票に書かれているすべての文字（活字・手書き問わず）を読み取ったそのままの全文テキストを改行区切りで出力してください。ただし「〃」「↓」等の記号自体はそのまま転記して構いません（正規化するのはextracted_dataのみです）。
- extracted_data 内の略称や崩し文字（例：「特自ン」→「特定自主点検」）は、文脈から正しい標準表記に修正して抽出してください。
- 工賃（work_time）・出張費（travel_time）の作業時間は、時間(H)と分(M)の両方が記載されている場合は「1H30M」のように出力してください。分の数字が空欄・未記入の場合は時間のみ「2H0M」のように分を0として出力し、時間の数字が空欄・未記入の場合はHを省略して「30M」のように分のみを出力してください。work_time_minutes / travel_time_minutes は出力不要です（アプリ側で自動計算します）。
- 使用部品テーブルの各行から、使用部品（part_name）、部品番号（part_no）、個数（quantity）、仕入金額（purchase_amount）、請求金額（billing_amount）、部品提供先（supplier）を抽出してください。
- 使用部品テーブルの各欄に「〃」（ノノ字点）、「↓」などの矢印、縦の罫線など「上の段と同じ」を意味する記号が書かれている場合は、その記号自体をextracted_dataの値として抽出せず、実際の値が記載されている直近の上の段まで遡り、その値を代わりに採用してください（part_name, part_no, quantity, purchase_amount, billing_amount, supplierのいずれの欄でも同様に適用してください）。
- 個数（quantity）の数字の後にリットルを表す単位記号（半角/全角のL、または「ℓ」）が付いている場合、数字部分のみを抽出し単位記号は完全に取り除いてください（例: 「7ℓ」→「7」、「7L」→「7」）。
- 仕入金額（purchase_amount）の欄が「×190 1330」のように「×(数字A) (数字B)」の形式で2つの数字が並んでいる場合、必ず×の直後にある数字A（単価）のみを抽出してください。数字B（数字Aとの掛け算の結果である合計額）は抽出しないでください。×記号が無く単一の金額のみが記載されている場合はその値をそのまま抽出してください。
- 部品提供先（supplier）の欄に「在」という文字がデフォルトで印字されている場合、それは「在庫」を意味する既定表記であり実際の提供先名ではありません。「在」のみが記載されている場合はnullとして扱い、「在」の後に別の提供先名が続く場合はその部分のみを抽出してください。
- 部品仕入合計 (total_purchase_amount) は、パーツリストの（仕入金額 × 個数）を計算・集計して出力してください。明確な記載がある場合はその値を優先しても構いません。
- 部品請求合計 (total_billing_amount) は、パーツリストの（請求金額 × 個数）を計算・集計して出力してください。明確な記載がある場合はその値を優先しても構いません。
- 得意先名（customer）が「厚木リース機」「相模原リース機」「大和リース機」「町田リース機」「双葉リース機」のいずれかである場合、読み取った文字が多少不明瞭であってもこれら5つの正式名称のいずれかに正規化してください。特に「機」の字は「器」「木」「株」等に誤読しやすいので注意し、末尾は必ず「〇〇リース機」の形にしてください。これら5つのいずれにも該当しない場合は、先方（得意先企業）の会社名をそのまま出力してください。
- customer_type は、customerが上記5つの自社リース機のいずれかであれば 'own_lease' を、それ以外（先方企業）であれば 'client' を出力してください。
- 帳票内のすべての手書き文字・数字を漏らさず拾い上げてください。
- 該当する記載がない項目は null にしてください。
"""
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

        # work_time / travel_time を分単位の数値に変換、quantity / purchase_amount をクリーニング
        # Geminiの出力に頼らず、常にPython側の正規表現パースで確定させる
        extracted = result.get("extracted_data", {})
        if isinstance(extracted, dict):
            extracted["work_time_minutes"] = parse_time_to_minutes(extracted.get("work_time"))
            extracted["travel_time_minutes"] = parse_time_to_minutes(extracted.get("travel_time"))

            # customer / customer_type をPython側でも二重チェックして確定させる
            normalized_customer, customer_type = normalize_customer(extracted.get("customer"))
            extracted["customer"] = normalized_customer
            extracted["customer_type"] = customer_type

            parts_list = extracted.get("parts_list", [])
            if isinstance(parts_list, list):
                for part in parts_list:
                    if isinstance(part, dict):
                        part["quantity"] = clean_quantity(part.get("quantity"))
                        part["purchase_amount"] = clean_purchase_amount(part.get("purchase_amount"))
                extracted["parts_list"] = fill_down_supplier(parts_list)

        return result

gemini_service = GeminiService()

