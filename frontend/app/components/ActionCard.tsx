'use client';

import { useRouter } from 'next/navigation';

interface ActionCardProps {
  title: string;
  description: string;
  href: string;
}

export default function ActionCard({ title, description, href }: ActionCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(href)}
      className="cursor-pointer rounded-lg border border-slate-200 p-4 transition-all hover:border-blue-400 hover:shadow-sm"
    >
      <h3 className="font-medium text-slate-800">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
