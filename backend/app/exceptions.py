"""
app/exceptions.py

OCR処理パイプライン全体で使う独自例外クラス。
Cloud Tasksへのリトライ制御（無限リトライ防止）のために、
「リトライすれば直る可能性がある失敗」と「リトライしても直らない失敗」を区別する。
"""


class OCRProcessingError(Exception):
    """
    OCR処理パイプライン内で発生するエラーの基底クラス。
    PermanentError / TransientError はこれを継承する。
    直接使わず、必ずどちらかのサブクラスを使うこと。
    """
    pass


class PermanentError(OCRProcessingError):
    """
    リトライしても解決しない恒久的な失敗。

    想定ケース:
    - Geminiのモデル名が存在しない・廃止された（404など）
    - APIキーが無効・権限不足（401/403）
    - リクエスト内容が不正（不正なPDF、パース不能なJSON応答など）

    → Cloud Tasksにはリトライさせず、失敗として記録して処理を終了させる。
    """
    pass


class TransientError(OCRProcessingError):
    """
    リトライすれば解決する可能性がある一時的な失敗。

    想定ケース:
    - ネットワークの瞬断・タイムアウト
    - Gemini側の一時的な障害（5xx系）
    - レート制限（429） ※時間を置けば成功する可能性があるため

    → Cloud Tasksにリトライさせる（500エラーを返す）。
    """
    pass
    