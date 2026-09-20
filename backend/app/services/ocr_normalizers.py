"""
Geminiの解析結果に対する、Python側の正規化・クリーニング処理。
プロンプトの指示だけでは完全に安定しない項目を、ここで確実に補正する。
"""

import re
import difflib
from typing import Optional
from app.known_names import KNOWN_LEASE_NAMES, KNOWN_SUPPLIER_NAMES


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

    if value in KNOWN_LEASE_NAMES:
        return value, "own_lease"

    matches = difflib.get_close_matches(value, KNOWN_LEASE_NAMES, n=1, cutoff=0.6)
    if matches:
        return matches[0], "own_lease"

    if "リース機" in value or "リース器" in value:
        return value, "own_lease"

    return value, "client"


def normalize_supplier(value: Optional[str]) -> Optional[str]:
    """
    supplierの値を既知の業者名リストと比較し、近似していれば正式名称に補正する。
    リストに近似する業者が無い場合は、元の値をそのまま返す
    （未知の新規業者名を誤って別の業者名に変換してしまわないため）。
    """
    if not value:
        return value

    value = value.strip()

    if value in KNOWN_SUPPLIER_NAMES:
        return value

    matches = difflib.get_close_matches(value, KNOWN_SUPPLIER_NAMES, n=1, cutoff=0.6)
    if matches:
        return matches[0]

    return value


def apply_all_normalizations(extracted: dict) -> dict:
    """
    Geminiの解析結果(extracted_data)に対して、上記の正規化・クリーニングを
    まとめて適用するエントリポイント。gemini_service.py側から1回呼ぶだけでよい。
    """
    if not isinstance(extracted, dict):
        return extracted

    extracted["work_time_minutes"] = parse_time_to_minutes(extracted.get("work_time"))
    extracted["travel_time_minutes"] = parse_time_to_minutes(extracted.get("travel_time"))

    normalized_customer, customer_type = normalize_customer(extracted.get("customer"))
    extracted["customer"] = normalized_customer
    extracted["customer_type"] = customer_type

    parts_list = extracted.get("parts_list", [])
    if isinstance(parts_list, list):
        for part in parts_list:
            if isinstance(part, dict):
                part["quantity"] = clean_quantity(part.get("quantity"))
                part["purchase_amount"] = clean_purchase_amount(part.get("purchase_amount"))

        parts_list = fill_down_supplier(parts_list)

        for part in parts_list:
            if isinstance(part, dict):
                part["supplier"] = normalize_supplier(part.get("supplier"))

        extracted["parts_list"] = parts_list

    return extracted
    