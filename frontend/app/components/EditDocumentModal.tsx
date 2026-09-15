'use client';

import { useState } from 'react';
import { DocumentData } from './DocumentCard';

interface EditDocumentModalProps {
  doc: DocumentData;
  onClose: () => void;
  onSave: (docId: string, filename: string, extractedData: any) => Promise<void>;
}

export default function EditDocumentModal({ doc, onClose, onSave }: EditDocumentModalProps) {
  const [filename, setFilename] = useState(doc.filename || '');
  const [jsonString, setJsonString] = useState(
    JSON.stringify(doc.extracted_data || {}, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSave = async () => {
    let parsedJson = {};
    try {
      parsedJson = JSON.parse(jsonString);
      setJsonError(null);
    } catch {
      setJsonError('JSONの形式が正しくありません。');
      return;
    }

    setIsUpdating(true);
    try {
      await onSave(doc.id, filename, parsedJson);
      onClose();
    } catch (err: any) {
      alert(err.message || '更新中にエラーが発生しました');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 text-slate-800">
        <h3 className="text-lg font-bold text-slate-800 mb-4">ドキュメントの編集</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ファイル名
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              抽出データ (JSON)
            </label>
            <textarea
              rows={10}
              value={jsonString}
              onChange={(e) => setJsonString(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {jsonError && <p className="text-sm text-red-600 mt-1">{jsonError}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 text-sm font-medium transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {isUpdating ? '保存中 ...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
