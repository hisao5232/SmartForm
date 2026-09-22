"""
OCR解析結果のPydanticスキーマ定義。
Geminiの response_schema として使われ、出力JSONの構造を強制する。
各フィールドのdescriptionはGeminiへの実質的な抽出指示としても機能する。
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class PartItem(BaseModel):
    part_name: Optional[str] = Field(
        default=None,
        description="使用部品（品名）。欄に「〃」（ノノ字点）、「↓」などの矢印、縦の罫線など"
                    "「上の段と同じ」を意味する記号が書かれている場合は、その記号ではなく、"
                    "実際の値が記載されている直近の上の段まで遡って同じ値を採用する"
    )
    part_no: Optional[str] = Field(
        default=None,
        description="部品番号。欄に「〃」（ノノ字点）、「↓」などの矢印、縦の罫線など"
                    "「上の段と同じ」を意味する記号が書かれている場合は、その記号ではなく、"
                    "実際の値が記載されている直近の上の段まで遡って同じ値を採用する"
    )
    quantity: Optional[str] = Field(
        default=None,
        description="個数。数字の後にリットルを表す単位記号（L, l, ℓ, リットル等)が付いている場合は、"
                    "数字部分のみを抽出し単位記号は完全に取り除く（例: '7ℓ' → '7', '7L' → '7'）。"
                    "欄に「〃」（ノノ字点）、「↓」などの矢印、縦の罫線など「上の段と同じ」を意味する"
                    "記号が書かれている場合は、その記号ではなく、実際の値が記載されている直近の"
                    "上の段まで遡って同じ値を採用する"
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
                    "欄に「〃」（ノノ字点）、「↓」などの矢印、縦の罫線など「上の段と同じ」を意味する"
                    "記号が書かれている場合は、その記号ではなく、実際の値が記載されている直近の"
                    "上の段まで遡って同じ値を採用する。この矢印や罫線は複数行にわたって連続している"
                    "場合があるため、テーブル全体を上から下まで丁寧に確認して同じ値を繰り返し適用する。"
                    "値が読み取れない場合は文字列の'-'ではなく必ずnullを出力する"
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
                    "すべて「厚木リース機」に統一する。特に「機」の字は「器」「木」等に誤読されやすいため注意する）。"
                    "これらの自社リース機のいずれにも該当しない場合は、先方（得意先企業）の会社名をそのまま出力する"
    )
    customer_type: Optional[str] = Field(
        default=None,
        description="customerが自社のリース機（厚木リース機/相模原リース機/大和リース機/町田リース機/双葉リース機）"
                    "のいずれかである場合は 'own_lease' を出力し、それ以外（先方企業の機械）の場合は 'client' を出力する"
    )
    billing_to: Optional[str] = Field(default=None, description="請求先")
    site_name: Optional[str] = Field(default=None, description="現場名")
    repair_location_type: Optional[str] = Field(
        default=None,
        description="site_name（現場名）から判定される修理区分。"
                    "この値はGeminiではなくPython側で計算するため、出力しなくてよい"
    )
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
    