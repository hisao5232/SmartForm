'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DocumentCard, { DocumentData } from '@/app/components/DocumentCard';
import EditDocumentModal from '@/app/components/EditDocumentModal';
import SearchForm from '@/app/components/SearchForm';

export default function SearchPage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingDoc, setEditingDoc] = useState<DocumentData | null>(null);

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
            keyword={keyword}
            setKeyword={setKeyword}
            onSearch={handleSearch}
            onReset={() => {
              setKeyword('');
              fetchDocuments();
            }}
          />

          {error && (
            <div className="p-4 mb-4 text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-500">読み込み中 ...</div>
          ) : (
            <div className="space-y-4">
              {documents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  データが見つかりませんでした
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
