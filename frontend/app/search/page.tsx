'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PartItem {
  part_name?: string;
  quantity?: string | number;
  category?: string; // 仕入先・分類
  amount?: string | number;
}

interface ExtractedData {
  date?: string;
  receipt_no?: string;
  customer?: string;
  machine_name?: string;
  management_no?: string;
  hour_meter?: string | number;
  repair_staff?: string;
  work_time?: string;
  travel_time?: string;
  parts_list?: PartItem[];
  total_parts_amount?: string | number;
  [key: string]: any;
}

interface DocumentData {
  id: string;
  filename: string;
  raw_text?: string;
  extracted_data?: ExtractedData;
  created_at?: string;
  updated_at?: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 編集ダイアログ用ステート
  const [editingDoc, setEditingDoc] = useState<DocumentData | null>(null);
  const [editJsonString, setEditJsonString] = useState('');
  const [editFilename, setEditFilename] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://smartform-backend-416426508758.asia-northeast1.run.app';

  // 一覧取得
  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ocr/documents?limit=20`);
      if (!res.ok) throw new Error('一覧の取得に失敗しました');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 検索処理
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      fetchDocuments();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/ocr/search?q=${encodeURIComponent(keyword)}`
      );
      if (!res.ok) throw new Error('検索に失敗しました');
      const data = await res.json();
      setDocuments(data.results || []);
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleOpenEdit = (doc: DocumentData) => {
    setEditingDoc(doc);
    setEditFilename(doc.filename || '');
    setEditJsonString(JSON.stringify(doc.extracted_data || {}, null, 2));
    setJsonError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    let parsedJson = {};
    try {
      parsedJson = JSON.parse(editJsonString);
      setJsonError(null);
    } catch (e) {
      setJsonError('JSONの形式が正しくありません。');
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/ocr/documents/${editingDoc.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: editFilename,
            extracted_data: parsedJson,
          }),
        }
      );
      if (!res.ok) throw new Error('更新に失敗しました');
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === editingDoc.id
            ? { ...doc, filename: editFilename, extracted_data: parsedJson }
            : doc
        )
      );
      setEditingDoc(null);
    } catch (err: any) {
      alert(err.message || '更新中にエラーが発生しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('このドキュメントを削除してもよろしいですか？')) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/ocr/documents/${docId}`,
        {
          method: 'DELETE',
        }
      );
      if (!res.ok) throw new Error('削除に失敗しました');
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    } catch (err: any) {
      alert(err.message || '削除中にエラーが発生しました');
    }
  };

  // 部品合計金額の簡易フォールバック計算関数
  const calculateTotalParts = (data?: ExtractedData) => {
    if (data?.total_parts_amount) return data.total_parts_amount;
    if (!data?.parts_list || !Array.isArray(data.parts_list)) return '-';

    let total = 0;
    let hasValidCalculation = false;

    for (const part of data.parts_list) {
      const qty = parseFloat(String(part.quantity || '0').replace(/,/g, ''));
      const amt = parseFloat(String(part.amount || '0').replace(/,/g, ''));
      if (!isNaN(qty) && !isNaN(amt) && qty > 0 && amt > 0) {
        total += qty * amt;
        hasValidCalculation = true;
      }
    }

    return hasValidCalculation ? `¥${total.toLocaleString()}` : '-';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* ナビゲーションバー */}
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

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-6xl p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            🔍 ドキュメント検索・管理
          </h2>

          {/* 検索フォーム */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="ファイル名やテキストで検索..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="flex-1 p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              検索
            </button>
            {keyword && (
              <button
                type="button"
                onClick={() => {
                  setKeyword('');
                  fetchDocuments();
                }}
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              >
                リセット
              </button>
            )}
          </form>

          {/* エラー表示 */}
          {error && (
            <div className="p-4 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* ロード中 または カード一覧表示 */}
          {loading ? (
            <div className="text-center py-12 text-slate-500">
              読み込み中 ...
            </div>
          ) : (
            <div className="space-y-4">
              {documents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  データが見つかりませんでした
                </div>
              ) : (
                documents.map((doc) => {
                  const ext = doc.extracted_data || {};
                  return (
                    <div
                      key={doc.id}
                      className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-all space-y-4"
                    >
                      {/* カードヘッダー */}
                      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">
                            {doc.filename}
                          </h3>
                          {doc.created_at && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              作成日時 :{' '}
                              {new Date(doc.created_at).toLocaleString('ja-JP')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </div>

                      {/* 主要データ一覧（グリッド表示） */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-slate-50/70 p-4 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-xs text-slate-500 font-semibold block">日付</span>
                          <span className="font-medium text-slate-800">{ext.date || '-'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 font-semibold block">修理受品書No</span>
                          <span className="font-medium text-slate-800">{ext.receipt_no || '-'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 font-semibold block">得意先名</span>
                          <span className="font-medium text-slate-800">{ext.customer || '-'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 font-semibold block">担当者名</span>
                          <span className="font-medium text-slate-800">{ext.repair_staff || '-'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 font-semibold block">機械名</span>
                          <span className="font-medium text-slate-800">{ext.machine_name || '-'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 font-semibold block">管理番号</span>
                          <span className="font-medium text-slate-800">{ext.management_no || '-'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 font-semibold block">アワーメーター</span>
                          <span className="font-medium text-slate-800">{ext.hour_meter || '-'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 font-semibold block">工賃作業時間</span>
                          <span className="font-medium text-slate-800">{ext.work_time || '-'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 font-semibold block">出張費作業時間</span>
                          <span className="font-medium text-slate-800">{ext.travel_time || '-'}</span>
                        </div>
                        <div className="col-span-2 md:col-span-3">
                          <span className="text-xs text-slate-500 font-semibold block">使用部品代金合計</span>
                          <span className="font-bold text-blue-700 text-base">
                            {calculateTotalParts(ext)}
                          </span>
                        </div>
                      </div>

                      {/* 使用部品テーブル */}
                      <div>
                        <span className="text-xs font-semibold text-slate-600 block mb-1.5">
                          📦 使用部品リスト
                        </span>
                        {ext.parts_list && ext.parts_list.length > 0 ? (
                          <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-xs text-left text-slate-700">
                              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="p-2">品名</th>
                                  <th className="p-2 w-20 text-right">数量</th>
                                  <th className="p-2 w-28 text-right">金額</th>
                                  <th className="p-2 w-32">仕入先</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {ext.parts_list.map((part, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-2 font-medium">{part.part_name || '-'}</td>
                                    <td className="p-2 text-right">{part.quantity || '-'}</td>
                                    <td className="p-2 text-right">{part.amount || '-'}</td>
                                    <td className="p-2">{part.category || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            使用部品の登録はありません
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>

      {/* 編集モーダル */}
      {editingDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 text-slate-800">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              ドキュメントの編集
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ファイル名
                </label>
                <input
                  type="text"
                  value={editFilename}
                  onChange={(e) => setEditFilename(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  抽出データ (JSON)
                </label>
                <textarea
                  rows={10}
                  value={editJsonString}
                  onChange={(e) => setEditJsonString(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {jsonError && (
                  <p className="text-sm text-red-600 mt-1">{jsonError}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 text-sm font-medium transition-colors"
                disabled={isUpdating}
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {isUpdating ? '保存中 ...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
