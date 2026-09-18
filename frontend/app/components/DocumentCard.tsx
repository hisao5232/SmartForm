'use client';

export interface PartItem {
  part_name?: string;
  part_no?: string;
  quantity?: string | number;
  purchase_amount?: string | number;
  billing_amount?: string | number;
  supplier?: string;
}

export interface ExtractedData {
  date?: string;
  receipt_no?: string;
  customer?: string;
  machine_name?: string;
  management_no?: string;
  hour_meter?: string | number;
  repair_staff?: string;
  work_time?: string;
  travel_time?: string;
  parts_list?: PartItem[];
  total_purchase_amount?: string | number;
  total_billing_amount?: string | number;
  work_time_minutes?: number;    // ← 追加
  travel_time_minutes?: number;  // ← 追加
  [key: string]: any;
}

export interface DocumentData {
  id: string;
  filename: string;
  status?: 'completed' | 'failed' | string;
  error?: string;
  raw_text?: string;
  extracted_data?: ExtractedData;
  created_at?: string;
  updated_at?: string;
}

interface DocumentCardProps {
  doc: DocumentData;
  onEdit: (doc: DocumentData) => void;
  onDelete: (id: string) => void;
}

export default function DocumentCard({ doc, onEdit, onDelete }: DocumentCardProps) {
  const ext = doc.extracted_data || {};
  const isFailed = doc.status === 'failed';

  // タイトルの表示判定（receipt_no があれば「日報No: XXX」、無ければファイル名）
  const cardTitle = ext.receipt_no ? `日報No: ${ext.receipt_no}` : doc.filename;

  // 部品リストの (quantity × 単価) を合計するヘルパー。
  // amountKey で purchase_amount / billing_amount のどちらを集計するか切り替える。
  const calculatePartsTotal = (
    data: ExtractedData | undefined,
    amountKey: 'purchase_amount' | 'billing_amount',
    totalKey: 'total_purchase_amount' | 'total_billing_amount'
  ) => {
    if (data?.[totalKey]) return data[totalKey];
    if (!data?.parts_list || !Array.isArray(data.parts_list)) return '-';
    let total = 0;
    let hasValidCalculation = false;
    for (const part of data.parts_list) {
      const qty = parseFloat(String(part.quantity || '0').replace(/,/g, ''));
      const amt = parseFloat(String(part[amountKey] || '0').replace(/,/g, ''));
      if (!isNaN(qty) && !isNaN(amt) && qty > 0 && amt > 0) {
        total += qty * amt;
        hasValidCalculation = true;
      }
    }
    return hasValidCalculation ? `¥${total.toLocaleString()}` : '-';
  };

  return (
    <div
      className={`p-5 border rounded-xl bg-white shadow-sm hover:shadow-md transition-all space-y-4 ${
        isFailed ? 'border-red-300' : 'border-slate-200'
      }`}
    >
      {/* ヘッダー */}
      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800">{cardTitle}</h3>
            {isFailed ? (
              <span className="rounded-full border border-red-500/50 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
                ⚠️ 失敗
              </span>
            ) : (
              <span className="rounded-full border border-emerald-500/50 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">
                ✅ 完了
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {doc.filename}
            {doc.created_at && (
              <span className="ml-2">
                • 作成日時: {new Date(doc.created_at).toLocaleString('ja-JP')}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {!isFailed && (
            <button
              onClick={() => onEdit(doc)}
              className="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
            >
              編集
            </button>
          )}
          <button
            onClick={() => onDelete(doc.id)}
            className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            削除
          </button>
        </div>
      </div>

      {isFailed ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="block text-xs font-semibold text-red-500 mb-1">エラー内容</span>
          {doc.error || '不明なエラーが発生しました'}
        </div>
      ) : (
        <>
          {/* 主要データグリッド */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-slate-50/70 p-4 rounded-lg border border-slate-100">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">日付</span>
              <span className="font-medium text-slate-800">{ext.date || '-'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">修理受品書 No</span>
              <span className="font-medium text-slate-800">{ext.receipt_no || '-'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">得意先名</span>
              <span className="font-medium text-slate-800">{ext.customer || '-'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">担当者名</span>
              <span className="font-medium text-slate-800">{ext.repair_staff || '-'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">機械名</span>
              <span className="font-medium text-slate-800">{ext.machine_name || '-'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">管理番号</span>
              <span className="font-medium text-slate-800">{ext.management_no || '-'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">アワーメーター</span>
              <span className="font-medium text-slate-800">{ext.hour_meter || '-'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">工賃作業時間</span>
              <span className="font-medium text-slate-800">{ext.work_time || '-'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 font-semibold block">出張費作業時間</span>
              <span className="font-medium text-slate-800">{ext.travel_time || '-'}</span>
            </div>
            {/* 変更: 使用部品代金合計 → 仕入部品合計・請求部品合計の2項目に分割 */}
            <div>
              <span className="text-xs text-slate-500 font-semibold block">仕入部品合計</span>
              <span className="font-bold text-slate-700 text-base">
                {calculatePartsTotal(ext, 'purchase_amount', 'total_purchase_amount')}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-slate-500 font-semibold block">請求部品合計</span>
              <span className="font-bold text-blue-700 text-base">
                {calculatePartsTotal(ext, 'billing_amount', 'total_billing_amount')}
              </span>
            </div>
          </div>

          {/* 使用部品テーブル */}
          <div>
            <span className="text-xs font-semibold text-slate-600 block mb-1.5">
              📦 使用部品リスト
            </span>
            {ext.parts_list && ext.parts_list.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2">使用部品</th>
                      <th className="p-2 w-24">部品番号</th>
                      <th className="p-2 w-16 text-right">個数</th>
                      <th className="p-2 w-24 text-right">仕入金額</th>
                      <th className="p-2 w-24 text-right">請求金額</th>
                      <th className="p-2 w-28">部品提供先</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {ext.parts_list.map((part, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-medium">{part.part_name || '-'}</td>
                        <td className="p-2">{part.part_no || '-'}</td>
                        <td className="p-2 text-right">{part.quantity || '-'}</td>
                        <td className="p-2 text-right">{part.purchase_amount || '-'}</td>
                        <td className="p-2 text-right">{part.billing_amount || '-'}</td>
                        <td className="p-2">{part.supplier || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                使用部品の登録はありません
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
