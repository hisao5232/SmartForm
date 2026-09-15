'use client';

export interface SearchParams {
  date: string;
  customer: string;
  machine_name: string;
  management_no: string;
  repair_staff: string;
  repair_summary: string;
  part_name: string;
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // いずれかの項目に入力があるかチェック
  const hasInput = Object.values(searchParams).some((val) => val.trim() !== '');

  return (
    <form onSubmit={onSearch} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">日付</label>
          <input
            type="text"
            name="date"
            placeholder="例: 2026-09-08"
            value={searchParams.date}
            onChange={handleChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">得意先名</label>
          <input
            type="text"
            name="customer"
            placeholder="得意先名で検索..."
            value={searchParams.customer}
            onChange={handleChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">機械名</label>
          <input
            type="text"
            name="machine_name"
            placeholder="例: RX306"
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
            placeholder="管理番号で検索..."
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
            placeholder="担当者名で検索..."
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
            placeholder="例: 特定自主点検"
            value={searchParams.repair_summary}
            onChange={handleChange}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-xs font-semibold text-slate-600 mb-1">使用部品名</label>
          <input
            type="text"
            name="part_name"
            placeholder="品名・部品名で検索..."
            value={searchParams.part_name}
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
