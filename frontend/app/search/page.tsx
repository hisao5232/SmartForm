'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsLoggedIn, setLoggedIn } from '@/lib/auth';

// 報告書ドキュメントの型定義
interface ReportDocument {
  id: string;
  filename: string;
  created_at?: string;
  extracted_data: {
    report_no?: string;
    receipt_no?: string;
    date?: string;
    customer?: string;
    billing_to?: string;
    site_name?: string;
    machine_name?: string;
    management_no?: string;
    hour_meter?: string;
    repair_staff?: string;
    repair_summary?: string;
    parts_list?: Array<{
      part_name?: string;
      quantity?: string;
    }>;
  };
}

export default function SearchPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ReportDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ReportDocument | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (!checkIsLoggedIn()) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
      // 初回表示時に一覧を取得する場合はここでコール
      fetchDocuments();
    }
  }, [router]);

  const handleLogout = () => {
    setLoggedIn(false);
    router.push('/login');
  };

  // ドキュメント一覧／検索のAPIコール
  const fetchDocuments = async (query = '') => {
    setIsLoading(true);
    try {
      // バックエンドの検索または一覧取得APIへリクエスト
      const baseUrl = 'https://smartform-backend-416426508758.asia-northeast1.run.app/api/v1/ocr';
      const endpoint = query ? `${baseUrl}/search?q=${encodeURIComponent(query)}` : `${baseUrl}/documents`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        // APIレスポンス配列のセット (※未実装時はダミーにフォールバック)
        setResults(Array.isArray(data) ? data : data.documents || []);
      } else {
        console.error('API Error:', res.statusText);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments(searchQuery);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <h1
              onClick={() => router.push('/')}
              className="cursor-pointer text-xl font-bold text-slate-800"
            >
              SmartForm
            </h1>
            <span className="text-sm font-medium text-slate-400">/ データベース検索</span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-6xl p-6 space-y-6">
        {/* 検索フォーム */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            修理報告書データベース検索
          </h2>
          <form onSubmit={handleSearchSubmit} className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="得意先名、機械名（RX306等）、修理担当者、部品名、報告書Noで検索..."
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:bg-slate-400"
            >
              {isLoading ? '検索中...' : '検索'}
            </button>
          </form>
        </div>

        {/* 検索結果リスト */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b pb-4 mb-4">
            <h3 className="font-semibold text-slate-800">
              検索結果 ({results.length} 件)
            </h3>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400">データを取得中...</div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              該当する報告書データが見つかりませんでした。
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {results.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="cursor-pointer rounded-lg border border-slate-200 p-4 transition-all hover:border-blue-400 hover:shadow-sm bg-slate-50/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      No. {doc.extracted_data?.report_no || '未設定'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {doc.extracted_data?.date || doc.created_at || ''}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-base">
                    {doc.extracted_data?.customer || '得意先不明'}
                  </h4>

                  <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400">機械名: </span>
                      <span className="font-semibold text-slate-700">{doc.extracted_data?.machine_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">管理No: </span>
                      <span>{doc.extracted_data?.management_no || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">担当: </span>
                      <span>{doc.extracted_data?.repair_staff || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">アワー: </span>
                      <span>{doc.extracted_data?.hour_meter || '-'}</span>
                    </div>
                  </div>

                  {doc.extracted_data?.repair_summary && (
                    <div className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-600">
                      <span className="text-slate-400">修理内容: </span>
                      <span className="font-medium text-slate-800">{doc.extracted_data.repair_summary}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 詳細モーダル（ダイアログ） */}
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-bold text-slate-800">
                  報告書詳細 (No. {selectedDoc.extracted_data?.report_no || selectedDoc.id})
                </h3>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4 text-sm text-slate-700">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div><span className="text-slate-400">得意先:</span> <span className="font-bold">{selectedDoc.extracted_data?.customer}</span></div>
                  <div><span className="text-slate-400">請求先:</span> <span>{selectedDoc.extracted_data?.billing_to || '-'}</span></div>
                  <div><span className="text-slate-400">機械名:</span> <span className="font-bold text-blue-600">{selectedDoc.extracted_data?.machine_name}</span></div>
                  <div><span className="text-slate-400">管理番号:</span> <span>{selectedDoc.extracted_data?.management_no}</span></div>
                  <div><span className="text-slate-400">日付:</span> <span>{selectedDoc.extracted_data?.date}</span></div>
                  <div><span className="text-slate-400">修理担当:</span> <span>{selectedDoc.extracted_data?.repair_staff}</span></div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">修理内容</h4>
                  <p className="bg-slate-50 p-3 rounded border border-slate-200">{selectedDoc.extracted_data?.repair_summary || 'なし'}</p>
                </div>

                {selectedDoc.extracted_data?.parts_list && selectedDoc.extracted_data.parts_list.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-1">使用部品</h4>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="p-2 border-b">部品名</th>
                            <th className="p-2 border-b">数量</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDoc.extracted_data.parts_list.map((part, idx) => (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="p-2">{part.part_name}</td>
                              <td className="p-2">{part.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
