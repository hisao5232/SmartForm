'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DocumentCard, { DocumentData } from '@/app/components/DocumentCard';
import EditDocumentModal from '@/app/components/EditDocumentModal';
import SearchForm, { SearchParams } from '@/app/components/SearchForm';

const initialSearchParams: SearchParams = {
  date: '',
  start_date: '',
  end_date: '',
  customer: '',
  machine_name: '',
  management_no: '',
  repair_staff: '',
  repair_summary: '',
  part_name: '',
};

export default function SearchPage() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<SearchParams>(initialSearchParams);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentData | null>(null);
  // 検索を実行したかどうかを判定するフラグ
  const [hasSearched, setHasSearched] = useState(false);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://smartform-backend-416426508758.asia-northeast1.run.app';

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

  // 検索処理
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    const queryParams = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value.trim()) {
        queryParams.append(key, value.trim());
      }
    });

    // 何も入力されていない場合は全件取得
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

  // フォームリセット処理
  const handleReset = () => {
    setSearchParams(initialSearchParams);
    setDocuments([]);
    setHasSearched(false);
    setError(null);
  };

  // 更新保存処理
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

  // 削除処理
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
          <SearchForm
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            onSearch={handleSearch}
            onReset={handleReset}
          />

          {/* 検索実行後の件数表示エリア */}
          {hasSearched && !loading && !error && (
            <div className="mt-6 mb-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm font-medium text-slate-600">
                検索結果: <span className="text-base font-bold text-blue-600">{documents.length}</span> 件
              </span>
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

      {/* 編集モーダル */}
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
