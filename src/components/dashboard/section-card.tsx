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
      className="group rounded-xl border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
    >
      <h3 className="text-lg font-semibold text-[var(--brand)]">{title}</h3>
      <p className="mt-2 text-sm text-black/70">{description}</p>
      <p className="mt-4 text-sm font-medium text-[var(--brand)] group-hover:underline">Open</p>
    </Link>
  );
}
