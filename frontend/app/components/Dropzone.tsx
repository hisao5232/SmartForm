'use client';

import { useRef, useEffect, DragEvent, ChangeEvent } from 'react';

interface DropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
}

export default function Dropzone({ onFilesSelected, isDragging, setIsDragging }: DropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

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
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
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
  );
}
