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
      className="group rounded-xl border border-[var(--brand-dark)]/20 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-3 h-1 w-14 rounded bg-[var(--brand-yellow)]" />
      <h3 className="text-lg font-semibold text-[var(--brand)]">{title}</h3>
      <p className="mt-2 text-sm text-black/70">{description}</p>
      <p className="mt-4 text-xs font-semibold tracking-[0.1em] text-[var(--brand)] group-hover:underline">OPEN</p>
    </Link>
  );
}
