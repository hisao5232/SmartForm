'use client';

import { useRouter } from 'next/navigation';
import { setLoggedIn } from '@/lib/auth';

interface HeaderProps {
  currentPageLabel?: string;
}

export default function Header({ currentPageLabel }: HeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    setLoggedIn(false);
    router.push('/login');
  };

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          <h1
            onClick={() => router.push('/')}
            className="cursor-pointer text-xl font-bold text-slate-800 hover:opacity-80"
          >
            SmartForm
          </h1>
          {currentPageLabel && (
            <span className="text-sm font-medium text-slate-400">
              / {currentPageLabel}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}
