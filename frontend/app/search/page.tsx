'use client';

import { useState, useMemo } from 'react';  // ← useMemo を追加
import { useRouter } from 'next/navigation';
import DocumentCard, { DocumentData } from '@/app/components/DocumentCard';
import EditDocumentModal from '@/app/components/EditDocumentModal';
import SearchForm, { SearchParams } from '@/app/components/SearchForm';

const initialSearchParams: SearchParams = {
  date: '',
  start_date: '',
  end_date: '',
  customer: '',
  customer_type: '',
  machine_name: '',
  management_no: '',
  repair_staff: '',
  repair_summary: '',
  part_name: '',
  part_no: '',
  supplier: '',
  status: '',
  repair_location_type: '',
};

// 金額文字列（"1,000" など）を数値に変換するヘルパー
const toNumber = (val: unknown): number => {
  const n = parseFloat(String(val ?? '0').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};

// 分数を "○H○M" 形式の文字列に変換するヘルパー（表示用）
const formatMinutes = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0 && m === 0) return '0M';
  if (h === 0) return `${m}M`;
  if (m === 0) return `${h}H`;
  return `${h}H${m}M`;
};

export default function SearchPage() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<SearchParams>(initialSearchParams);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://smartform-backend-416426508758.asia-northeast1.run.app';

  // 新規追加: 検索結果の集計（documentsが変わったときだけ再計算）
  const summary = useMemo(() => {
    let workTimeMinutes = 0;
    let travelTimeMinutes = 0;
    let totalPurchaseAmount = 0;
    let totalBillingAmount = 0;

    for (const doc of documents) {
      const ext = doc.extracted_data;
      if (!ext) continue;
      workTimeMinutes += toNumber(ext.work_time_minutes);
      travelTimeMinutes += toNumber(ext.travel_time_minutes);
      totalPurchaseAmount += toNumber(ext.total_purchase_amount);
      totalBillingAmount += toNumber(ext.total_billing_amount);
    }

    return { workTimeMinutes, travelTimeMinutes, totalPurchaseAmount, totalBillingAmount };
  }, [documents]);

  // 一覧取得（条件なし検索時など）
  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ocr/documents?limit=20`);
      if (!res.ok) throw new Error('一覧の取得に失敗しました');
      const data = await res.json();
      setDocuments(data.documents || []);
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    const queryParams = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value.trim()) {
        queryParams.append(key, value.trim());
      }
    });

    if (queryParams.toString() === '') {
      fetchDocuments();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/ocr/search?${queryParams.toString()}`
      );
      if (!res.ok) throw new Error('検索に失敗しました');
      const data = await res.json();
      setDocuments(data.results || []);
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchFailedOnly = async () => {
    setLoading(true);
    setError(null);
    setSearchParams({ ...initialSearchParams, status: 'failed' });
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ocr/search?status=failed`);
      if (!res.ok) throw new Error('検索に失敗しました');
      const data = await res.json();
      setDocuments(data.results || []);
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchParams(initialSearchParams);
    setDocuments([]);
    setHasSearched(false);
    setError(null);
  };

  const handleSaveEdit = async (docId: string, filename: string, extracted_data: any) => {
    const res = await fetch(`${API_BASE_URL}/api/v1/ocr/documents/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, extracted_data }),
    });
    if (!res.ok) throw new Error('更新に失敗しました');
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, filename, extracted_data } : doc
      )
    );
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('このドキュメントを削除してもよろしいですか？')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ocr/documents/${docId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('削除に失敗しました');
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    } catch (err: any) {
      alert(err.message || '削除中にエラーが発生しました');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <h1
            className="text-xl font-bold text-slate-800 cursor-pointer"
            onClick={() => router.push('/')}
          >
            SmartForm
          </h1>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            ← ダッシュボードへ戻る
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">
              🔍 ドキュメント検索・管理
            </h2>

            <button
              type="button"
              onClick={fetchFailedOnly}
              disabled={loading}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              ⚠️ 失敗したレポートのみ表示
            </button>
          </div>

          <SearchForm
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            onSearch={handleSearch}
            onReset={handleReset}
          />

          {/* 検索実行後の件数表示・集計エリア */}
          {hasSearched && !loading && !error && (
            <div className="mt-6 mb-4 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">
                  検索結果: <span className="text-base font-bold text-blue-600">{documents.length}</span> 件
                </span>
              </div>

              {/* 新規追加: 集計サマリー（件数が0件のときは表示しない） */}
              {documents.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="text-xs text-slate-500 font-semibold block">工賃合計</span>
                    <span className="text-lg font-bold text-slate-800">
                      {formatMinutes(summary.workTimeMinutes)}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="text-xs text-slate-500 font-semibold block">出張費合計</span>
                    <span className="text-lg font-bold text-slate-800">
                      {formatMinutes(summary.travelTimeMinutes)}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span className="text-xs text-slate-500 font-semibold block">仕入金額総合計</span>
                    <span className="text-lg font-bold text-slate-800">
                      ¥{summary.totalPurchaseAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <span className="text-xs text-blue-500 font-semibold block">請求金額総合計</span>
                    <span className="text-lg font-bold text-blue-700">
                      ¥{summary.totalBillingAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-500">読み込み中 ...</div>
          ) : (
            <div className="space-y-4">
              {!hasSearched ? (
                <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  検索条件を入力して「検索」ボタンを押してください
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  該当するデータが見つかりませんでした
                </div>
              ) : (
                documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onEdit={(targetDoc) => setEditingDoc(targetDoc)}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {editingDoc && (
        <EditDocumentModal
          doc={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
