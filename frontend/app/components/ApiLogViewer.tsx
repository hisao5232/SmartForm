'use client';

export interface OCRResult {
  id?: string;
  filename?: string;
  message?: string;
  task_id?: string;
  status?: string;
  raw_text?: string;
  extracted_data?: {
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

export interface ApiResponse {
  statusCode: number;
  statusText: string;
  data: OCRResult | any | null;
  error?: string;
}

interface ApiLogViewerProps {
  apiResponse: ApiResponse;
}

export default function ApiLogViewer({ apiResponse }: ApiLogViewerProps) {
  const { statusCode, statusText, data, error } = apiResponse;

  return (
    <div className="rounded-xl border bg-slate-900 p-6 text-slate-100 shadow-lg transition-all">
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div className="flex items-center space-x-3">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
            Backend API Log
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-bold ${
              statusCode >= 200 && statusCode < 300
                ? 'border border-emerald-500/50 bg-emerald-900/80 text-emerald-300'
                : 'border border-red-500/50 bg-red-900/80 text-red-300'
            }`}
          >
            HTTP {statusCode} {statusText}
          </span>
        </div>
        {data?.id && (
          <span className="font-mono text-xs text-slate-400">
            Doc ID: <span className="text-amber-400">{data.id}</span>
          </span>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-800/60 bg-red-950/50 p-4 font-mono text-xs text-red-300">
          ❌ {error}
        </div>
      )}

      {/* 成功時のデータプレビュー表示 */}
      {data && (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              {data.extracted_data ? 'Firestore Saved Data (extracted_data)' : 'Response Info'}
            </h4>

            {data.extracted_data ? (
              /* 同期処理時の抽出データ表示 */
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs sm:grid-cols-3">
                <div><span className="text-slate-500">報告書No:</span> <span className="text-emerald-400">{data.extracted_data?.report_no || '-'}</span></div>
                <div><span className="text-slate-500">受品書No:</span> <span className="text-emerald-400">{data.extracted_data?.receipt_no || '-'}</span></div>
                <div><span className="text-slate-500">日付:</span> <span className="text-slate-200">{data.extracted_data?.date || '-'}</span></div>
                <div><span className="text-slate-500">得意先:</span> <span className="text-slate-200">{data.extracted_data?.customer || '-'}</span></div>
                <div><span className="text-slate-500">機械名:</span> <span className="font-bold text-amber-300">{data.extracted_data?.machine_name || '-'}</span></div>
                <div><span className="text-slate-500">管理番号:</span> <span className="text-slate-200">{data.extracted_data?.management_no || '-'}</span></div>
                <div><span className="text-slate-500">担当者:</span> <span className="text-slate-200">{data.extracted_data?.repair_staff || '-'}</span></div>
                <div className="col-span-2"><span className="text-slate-500">修理内容:</span> <span className="text-slate-200">{data.extracted_data?.repair_summary || '-'}</span></div>
              </div>
            ) : (
              /* 非同期/upload（202 Accepted）受諾メッセージ表示 */
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-400">
                <p>💡 {data?.message ?? 'アップロードを受け付けました（バックエンドで非同期処理中）'}</p>
                {data?.task_id && <p className="mt-1 text-slate-400">Task ID: {data.task_id}</p>}
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Raw JSON Response
            </h4>
            <pre className="max-h-60 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-400">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
