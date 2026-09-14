'use client';

import { useState, useEffect, useRef, ChangeEvent, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsLoggedIn, setLoggedIn } from '@/lib/auth';

interface UploadFile {
  id: string;
  file: File;
  previewUrl: string | null;
}

// APIレスポンスの型定義
interface OCRResult {
  id: string;
  filename: string;
  raw_text: string;
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
    work_time?: string;
    travel_time?: string;
    mileage?: string;
    total_amount?: string;
    parts_list?: Array<{
      part_name?: string;
      quantity?: string;
      category?: string;
      amount?: string;
    }>;
    other_notes?: string;
  };
}

interface ApiResponse {
  statusCode: number;
  statusText: string;
  data: OCRResult | null;
  error?: string;
}

export default function UploadPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // API送信・ステータス管理用状態
  const [isUploading, setIsUploading] = useState(false);
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);

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

  // OCR解析APIへの送信処理
  const handleUploadSubmit = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setApiResponse(null);

    // 今回は先頭の1件をテスト送信（必要に応じてループ処理や複数ファイル対応化が可能）
    const targetFile = files[0].file;
    const formData = new FormData();
    formData.append('file', targetFile);

    // ファイル形式に応じたエンドポイントの自動切替
    const isPdf = targetFile.type === 'application/pdf' || targetFile.name.endsWith('.pdf');
    const endpoint = isPdf ? 'transcribe-pdf' : 'transcribe-image';
    const apiUrl = `https://smartform-backend-416426508758.asia-northeast1.run.app/api/v1/ocr/${endpoint}`;

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      setApiResponse({
        statusCode: res.status,
        statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        data: res.ok ? data : null,
        error: res.ok ? undefined : data.detail || 'OCR処理に失敗しました',
      });
    } catch (err: any) {
      setApiResponse({
        statusCode: 500,
        statusText: 'Fetch Error',
        data: null,
        error: err.message || 'ネットワークエラーが発生しました',
      });
    } finally {
      setIsUploading(false);
    }
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

      <main className="mx-auto max-w-5xl space-y-6 p-6">
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
                  disabled={isUploading}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
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
                        className="h-12 w-12 rounded border object-cover"
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
                      disabled={isUploading}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleUploadSubmit}
                  disabled={isUploading}
                  className="flex items-center space-x-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:bg-slate-400"
                >
                  {isUploading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>OCR解析実行中...</span>
                    </>
                  ) : (
                    <span>OCR解析を実行する</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* バックエンドステータス・抽出データ表示ウィンドウ */}
        {apiResponse && (
          <div className="rounded-xl border bg-slate-900 text-slate-100 p-6 shadow-lg transition-all">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                  Backend API Log
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold font-mono ${
                    apiResponse.statusCode === 200
                      ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50'
                      : 'bg-red-900/80 text-red-300 border border-red-500/50'
                  }`}
                >
                  HTTP {apiResponse.statusCode} {apiResponse.statusText}
                </span>
              </div>
              {apiResponse.data?.id && (
                <span className="font-mono text-xs text-slate-400">
                  Doc ID: <span className="text-amber-400">{apiResponse.data.id}</span>
                </span>
              )}
            </div>

            {/* エラー表示 */}
            {apiResponse.error && (
              <div className="mt-4 rounded-lg bg-red-950/50 border border-red-800/60 p-4 text-xs text-red-300 font-mono">
                ❌ {apiResponse.error}
              </div>
            )}

            {/* 成功時のデータプレビュー表示 */}
            {apiResponse.data && (
              <div className="mt-4 space-y-4">
                {/* 構造化抽出データのキーバリュー表示 */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                    Firestore Saved Data (extracted_data)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950 p-4 rounded-lg text-xs font-mono border border-slate-800">
                    <div><span className="text-slate-500">報告書No:</span> <span className="text-emerald-400">{apiResponse.data.extracted_data.report_no || '-'}</span></div>
                    <div><span className="text-slate-500">受品書No:</span> <span className="text-emerald-400">{apiResponse.data.extracted_data.receipt_no || '-'}</span></div>
                    <div><span className="text-slate-500">日付:</span> <span className="text-slate-200">{apiResponse.data.extracted_data.date || '-'}</span></div>
                    <div><span className="text-slate-500">得意先:</span> <span className="text-slate-200">{apiResponse.data.extracted_data.customer || '-'}</span></div>
                    <div><span className="text-slate-500">機械名:</span> <span className="text-amber-300 font-bold">{apiResponse.data.extracted_data.machine_name || '-'}</span></div>
                    <div><span className="text-slate-500">管理番号:</span> <span className="text-slate-200">{apiResponse.data.extracted_data.management_no || '-'}</span></div>
                    <div><span className="text-slate-500">担当者:</span> <span className="text-slate-200">{apiResponse.data.extracted_data.repair_staff || '-'}</span></div>
                    <div className="col-span-2"><span className="text-slate-500">修理内容:</span> <span className="text-slate-200">{apiResponse.data.extracted_data.repair_summary || '-'}</span></div>
                  </div>
                </div>

                {/* 生レスポンス JSON ツリー表示 */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                    Raw JSON Response
                  </h4>
                  <pre className="max-h-60 overflow-y-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-emerald-400 border border-slate-800 leading-relaxed">
                    {JSON.stringify(apiResponse.data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
