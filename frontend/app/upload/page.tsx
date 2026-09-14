'use client';

import { useState, useEffect, useRef, ChangeEvent, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsLoggedIn, setLoggedIn } from '@/lib/auth';

interface UploadFile {
  id: string;
  file: File;
  previewUrl: string | null;
}

export default function UploadPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!checkIsLoggedIn()) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // フォルダ選択用の属性（directory/webkitdirectory）を設定
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const handleLogout = () => {
    setLoggedIn(false);
    router.push('/login');
  };

  const processFiles = (incomingFiles: FileList | File[]) => {
    const validExtensions = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const newUploadFiles: UploadFile[] = [];

    Array.from(incomingFiles).forEach((file) => {
      // 隠しファイルや対象外フォーマットの除外
      if (file.name.startsWith('.')) return;
      if (!validExtensions.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|pdf)$/i)) {
        return;
      }

      const isImage = file.type.startsWith('image/');
      newUploadFiles.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : null,
      });
    });

    setFiles((prev) => [...prev, ...newUploadFiles]);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleUploadSubmit = () => {
    if (files.length === 0) return;
    alert(`${files.length}件のファイルを準備しました（バックエンドAPI連携待機中）`);
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
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <h1
              onClick={() => router.push('/')}
              className="cursor-pointer text-xl font-bold text-slate-800"
            >
              SmartForm
            </h1>
            <span className="text-sm font-medium text-slate-400">/ アップロード</span>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            報告書のアップロード (OCR)
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            手書き報告書の画像（JPG, PNG, WebP）またはPDFファイルを選択・ドラッグ＆ドロップしてください。
          </p>

          {/* ドロップゾーン */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <div className="text-center">
              <p className="text-base font-medium text-slate-700">
                ここにファイルをドラッグ＆ドロップ
              </p>
              <p className="mt-1 text-xs text-slate-400">
                または以下のボタンから選択してください
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-3">
                {/* ファイル選択インプット */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500"
                >
                  📄 ファイルを選択
                </button>

                {/* フォルダ選択インプット */}
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  📁 フォルダを選択
                </button>
              </div>
            </div>
          </div>

          {/* 選択されたファイル一覧 */}
          {files.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-semibold text-slate-800">
                  選択中のファイル ({files.length}件)
                </h3>
                <button
                  onClick={() => setFiles([])}
                  className="text-xs text-red-600 hover:underline"
                >
                  すべて削除
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {files.map((item) => (
                  <div
                    key={item.id}
                    className="relative flex items-center space-x-3 rounded-lg border border-slate-200 p-3 shadow-sm"
                  >
                    {item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="h-12 w-12 rounded object-cover border"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 font-bold text-slate-500">
                        PDF
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-800">
                        {item.file.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {(item.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveFile(item.id)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleUploadSubmit}
                  className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                >
                  OCR解析を実行する
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
