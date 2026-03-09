import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export function SectionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-[var(--border)] bg-gradient-to-b from-white to-[var(--card-subtle)] p-5 shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
    >
      <div className="mb-3 h-1 w-12 rounded bg-[var(--brand-yellow)]" />
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[1.04rem] font-bold tracking-[-0.01em] text-[var(--heading)] normal-case">{title}</h3>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--brand)] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <p className="mt-2 text-sm leading-6 text-black/72">{description}</p>
      <p className="mt-4 text-xs font-semibold tracking-[0.04em] text-[var(--brand)]/90">OPEN WORKSPACE</p>
    </Link>
  );
}
