'use client';

interface SearchFormProps {
  keyword: string;
  setKeyword: (val: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onReset: () => void;
}

export default function SearchForm({ keyword, setKeyword, onSearch, onReset }: SearchFormProps) {
  return (
    <form onSubmit={onSearch} className="flex gap-2 mb-6">
      <input
        type="text"
        placeholder="ファイル名やテキストで検索..."
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="flex-1 p-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        検索
      </button>
      {keyword && (
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
        >
          リセット
        </button>
      )}
    </form>
  );
}
