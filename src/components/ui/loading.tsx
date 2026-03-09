import type { ReactNode } from 'react';

export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

export function LoadingCard({ title = 'Loading' }: { title?: string }) {
  return (
    <div className="section-card">
      <div className="section-card-body space-y-3">
        <p className="text-sm font-semibold text-[var(--heading)]">{title}</p>
        <LoadingRows rows={3} />
      </div>
    </div>
  );
}

export function LoadingGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading cards">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} title="Loading" />
      ))}
    </div>
  );
}

export function LoadingInline({ children = 'Loading…' }: { children?: ReactNode }) {
  return <p className="status-message">{children}</p>;
}
