'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkIsLoggedIn } from '@/lib/auth';
import Header from '@/app/components/Header';
import Dropzone from '@/app/components/Dropzone';
import ApiLogViewer, { ApiResponse } from '@/app/components/ApiLogViewer';

interface UploadFile {
  id: string;
  file: File;
  previewUrl: string | null;
}

export default function UploadPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [apiResponse, setApiResponse] = useState<ApiResponse | ApiResponse[] | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (!checkIsLoggedIn()) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // オブジェクトURLのクリーンアップ
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, [files]);

  const processFiles = (incomingFiles: FileList | File[]) => {
    const validExtensions = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const newUploadFiles: UploadFile[] = [];

    Array.from(incomingFiles).forEach((file) => {
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

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleClearAllFiles = () => {
    files.forEach((f) => {
      if (f.previewUrl) {
        URL.revokeObjectURL(f.previewUrl);
      }
    });
    setFiles([]);
  };

  // 単一ファイルのアップロード処理関数（新: 非同期 /upload エンドポイント対応）
  const uploadSingleFile = async (targetFile: File): Promise<ApiResponse> => {
    const formData = new FormData();
    formData.append('file', targetFile);

    // 画像・PDFともに単一の /upload エンドポイントに送信
    const apiUrl = 'https://smartform-backend-416426508758.asia-northeast1.run.app/api/v1/ocr/upload';

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      return {
        statusCode: res.status,
        statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        data: res.ok ? data : null,
        error: res.ok ? undefined : data.detail || `${targetFile.name} のアップロードに失敗しました`,
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        statusText: 'Fetch Error',
        data: null,
        error: err.message || `${targetFile.name} の送信中にネットワークエラーが発生しました`,
      };
    }
  };

  // 全ファイルの並列実行処理
  const handleUploadSubmit = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setApiResponse(null);

    try {
      // Promise.allSettled を使用することで一部のファイルがエラーになっても他を中断させない
      const uploadPromises = files.map((item) => uploadSingleFile(item.file));
      const results = await Promise.allSettled(uploadPromises);

      const responses: ApiResponse[] = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            statusCode: 500,
            statusText: 'Unhandled Error',
            data: null,
            error: `${files[index].file.name} の処理で予期せぬエラーが発生しました`,
          };
        }
      });

      // 単一ファイルの場合はオブジェクト、複数の場合は配列をセット（または常に配列形式に統一）
      setApiResponse(responses.length === 1 ? responses[0] : responses);
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
      <Header currentPageLabel="アップロード" />

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            報告書のアップロード (OCR)
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            手書き報告書の画像（JPG, PNG, WebP）またはPDFファイルを選択・ドラッグ＆ドロップしてください。
          </p>

          <Dropzone
            onFilesSelected={processFiles}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
          />

          {files.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-semibold text-slate-800">
                  選択中のファイル ({files.length}件)
                </h3>
                <button
                  onClick={handleClearAllFiles}
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
                      <span>OCR解析実行中 ({files.length}件)...</span>
                    </>
                  ) : (
                    <span>OCR解析を実行する ({files.length}件)</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {apiResponse && (
          Array.isArray(apiResponse) ? (
            apiResponse.map((res, idx) => (
              <ApiLogViewer key={idx} apiResponse={res} />
            ))
          ) : (
            <ApiLogViewer apiResponse={apiResponse} />
          )
        )}
      </main>
    </div>
  );
}
