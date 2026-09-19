'use client';

import { useState } from 'react';

export interface SearchParams {
  date: string;
  start_date: string;
  end_date: string;
  customer: string;
  customer_type: string;
  machine_name: string;
  management_no: string;
  repair_staff: string;
  repair_summary: string;
  part_name: string;
  part_no: string;
  supplier: string;
  status: string;
}

interface SearchFormProps {
  searchParams: SearchParams;
  setSearchParams: React.Dispatch<React.SetStateAction<SearchParams>>;
  onSearch: (e: React.FormEvent) => void;
  onReset: () => void;
}

export default function SearchForm({
  searchParams,
  setSearchParams,
  onSearch,
  onReset,
}: SearchFormProps) {
  const [dateMode, setDateMode] = useState<'single' | 'range'>(
    searchParams.start_date || searchParams.end_date ? 'range' : 'single'
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleModeChange = (mode: 'single' | 'range') => {
    setDateMode(mode);
    if (mode === 'single') {
      setSearchParams((prev) => ({ ...prev, start_date: '', end_date: '' }));
    } else {
      setSearchParams((prev) => ({ ...prev, date: '' }));
    }
  };

  const hasInput = Object.values(searchParams).some((val) => val.trim() !== '');

  return (
    <form onSubmit={onSearch} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* 日付検索エリア (モード切り替え付き) */}
        <div className="md:col-span-2 lg:col-span-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-700">日付検索</label>
            <div className="flex bg-slate-200 p-0.5 rounded-md text-xs font-medium">
              <button
                type="button"
                onClick={() => handleModeChange('single')}
                className={`px-2 py-0.5 rounded ${
                  dateMode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                指定日
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('range')}
                className={`px-2 py-0.5 rounded ${
                  dateMode === 'range' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                期間指定
              </button>
            </div>
          </div>
          {dateMode === 'single' ? (
            <input
              type="date"
              name="date"
              value={searchParams.date}
              onChange={handleChange}
              className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                name="start_date"
                value={searchParams.start_date}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <span className="text-slate-400 text-xs font-bold">〜</span>
              <input
                type="date"
                name="end_date"
                value={searchParams.end_date}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">得意先名</label>
          <input
            type="text"
            name="customer"
            placeholder="得意先名で検索 ..."
            value={searchParams.customer}
            onChange={handleChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* 新規追加: 得意先区分（自社リース機 / 先方企業）の絞り込み */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">得意先区分</label>
          <select
            name="customer_type"
            value={searchParams.customer_type}
            onChange={handleChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">すべて</option>
            <option value="own_lease">🏢 自社リース機</option>
            <option value="client">🤝 先方企業</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">機械名</label>
          <input
            type="text"
            name="machine_name"
            placeholder="例 : RX306"
            value={searchParams.machine_name}
            onChange={handleChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">管理番号</label>
          <input
            type="text"
            name="management_no"
            placeholder="管理番号で検索 ..."
            value={searchParams.management_no}
            onChange={handleChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">修理担当者名</label>
          <input
            type="text"
            name="repair_staff"
            placeholder="担当者名で検索 ..."
            value={searchParams.repair_staff}
            onChange={handleChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">作業内容 (修理概要)</label>
          <input
            type="text"
            name="repair_summary"
            placeholder="例 : 特定自主点検"
            value={searchParams.repair_summary}
            onChange={handleChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">処理ステータス</label>
          <select
            name="status"
            value={searchParams.status}
            onChange={handleChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">すべて</option>
            <option value="completed">✅ 完了</option>
            <option value="failed">⚠️ 失敗</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">使用部品</label>
          <input
            type="text"
            name="part_name"
            placeholder="品名・部品名で検索 ..."
            value={searchParams.part_name}
            onChange={handleChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">部品番号</label>
          <input
            type="text"
            name="part_no"
            placeholder="部品番号で検索 ..."
            value={searchParams.part_no}
            onChange={handleChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">部品提供先</label>
          <input
            type="text"
            name="supplier"
            placeholder="部品提供先で検索 ..."
            value={searchParams.supplier}
            onChange={handleChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {hasInput && (
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-sm font-medium"
          >
            条件リセット
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          検索
        </button>
      </div>
    </form>
  );
}
