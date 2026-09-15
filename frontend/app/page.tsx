'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsLoggedIn } from '@/lib/auth';
import Header from '@/app/components/Header';
import ActionCard from '@/app/components/ActionCard';

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

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-6xl p-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">ダッシュボード</h2>
          <p className="mt-2 text-sm text-slate-600">
            SmartFormへようこそ。手書き報告書のOCR読み取りおよびデータベース検索を開始できます。
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <ActionCard
              title="📄 報告書アップロード (OCR)"
              description="手書き報告書の画像・PDFをアップロードしてテキスト化します。"
              href="/upload"
            />
            <ActionCard
              title="🔍 データベース検索"
              description="蓄積された過去の報告書データから検索・閲覧できます。"
              href="/search"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
