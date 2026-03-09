import Link from 'next/link';

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
      className="group rounded-2xl border border-[var(--border)] bg-gradient-to-b from-white to-[var(--surface-subtle)] p-5 shadow-[0_1px_2px_rgba(20,46,35,0.06)] transition hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[0_10px_24px_rgba(20,46,35,0.1)]"
    >
      <div className="mb-3 h-1 w-14 rounded bg-[var(--brand-yellow)]" />
      <h3 className="text-[1.07rem] font-semibold tracking-[-0.01em] text-[var(--heading)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-black/70">{description}</p>
      <p className="mt-4 text-xs font-medium tracking-[0.04em] text-[var(--brand)] group-hover:text-[var(--brand-dark)]">
        Open workspace
      </p>
    </Link>
  );
}
