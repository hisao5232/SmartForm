'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsLoggedIn, setLoggedIn } from '@/lib/auth';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!checkIsLoggedIn()) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const handleLogout = () => {
    setLoggedIn(false);
    router.push('/login');
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
      {/* ナビゲーションバー */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <h1 className="text-xl font-bold text-slate-800">SmartForm</h1>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-6xl p-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">ダッシュボード</h2>
          <p className="mt-2 text-sm text-slate-600">
            SmartFormへようこそ。手書き報告書のOCR読み取りおよびデータベース検索を開始できます。
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div
              onClick={() => router.push('/upload')}
              className="cursor-pointer rounded-lg border border-slate-200 p-4 transition-all hover:border-blue-400 hover:shadow-sm"
            >
              <h3 className="font-medium text-slate-800">📄 報告書アップロード (OCR)</h3>
              <p className="mt-1 text-xs text-slate-500">
                手書き報告書の画像・PDFをアップロードしてテキスト化します。
              </p>
            </div>
            <div
              onClick={() => router.push('/search')}
              className="cursor-pointer rounded-lg border border-slate-200 p-4 transition-all hover:border-blue-400 hover:shadow-sm"
            >
              <h3 className="font-medium text-slate-800">🔍 データベース検索</h3>
              <p className="mt-1 text-xs text-slate-500">
                蓄積された過去の報告書データから検索・閲覧できます。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
