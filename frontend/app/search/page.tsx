'use client';

import { useState, useEffect } from 'react';

// ドキュメントの型定義
interface DocumentData {
  id: string;
  filename: string;
  raw_text?: string;
  extracted_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState('');
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 編集ダイアログ用のステート
  const [editingDoc, setEditingDoc] = useState<DocumentData | null>(null);
  const [editJsonString, setEditJsonString] = useState('');
  const [editFilename, setEditFilename] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ocr-backend-288651941478.asia-northeast1.run.app';

  // 一覧の取得
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
      const res = await fetch(`${API_BASE_URL}/api/v1/ocr/search?q=${encodeURIComponent(keyword)}`);
      if (!res.ok) throw new Error('検索に失敗しました');
      const data = await res.json();
      setDocuments(data.results || []);
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchDocuments();
  }, []);

  // --- 編集モーダルの開始 ---
  const handleOpenEdit = (doc: DocumentData) => {
    setEditingDoc(doc);
    setEditFilename(doc.filename || '');
    setEditJsonString(JSON.stringify(doc.extracted_data || {}, null, 2));
    setJsonError(null);
  };

  // --- 編集内容の保存 (PUT) ---
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
      const res = await fetch(`${API_BASE_URL}/api/v1/ocr/documents/${editingDoc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: editFilename,
          extracted_data: parsedJson,
        }),
      });

      if (!res.ok) throw new Error('更新に失敗しました');

      // 成功したらローカルのステートを更新して閉じる
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

  // --- 削除処理 (DELETE) ---
  const handleDelete = async (docId: string) => {
    if (!confirm('このドキュメントを削除してもよろしいですか？')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/ocr/documents/${docId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('削除に失敗しました');

      // 成功したらリストから除外
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
    } catch (err: any) {
      alert(err.message || '削除中にエラーが発生しました');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">ドキュメント検索・管理</h1>

      {/* 検索フォーム */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="ファイル名やテキストで検索..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
            className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            リセット
          </button>
        )}
      </form>

      {/* エラー表示 */}
      {error && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded">{error}</div>}

      {/* ローディング */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">読み込み中...</div>
      ) : (
        <div className="space-y-4">
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">データが見つかりませんでした</div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-lg font-semibold text-gray-800">{doc.filename}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(doc)}
                      className="px-3 py-1 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {/* Extracted Data (JSON表示) */}
                {doc.extracted_data && (
                  <div className="mt-2">
                    <span className="text-xs font-semibold text-gray-500">抽出データ:</span>
                    <pre className="p-2 mt-1 bg-gray-50 rounded text-xs overflow-x-auto border border-gray-100">
                      {JSON.stringify(doc.extracted_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 編集モーダル */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-xl font-bold mb-4">ドキュメントの編集</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ファイル名</label>
                <input
                  type="text"
                  value={editFilename}
                  onChange={(e) => setEditFilename(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  抽出データ (JSON)
                </label>
                <textarea
                  rows={10}
                  value={editJsonString}
                  onChange={(e) => setEditJsonString(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded font-mono text-xs"
                />
                {jsonError && <p className="text-sm text-red-600 mt-1">{jsonError}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                disabled={isUpdating}
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isUpdating ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
