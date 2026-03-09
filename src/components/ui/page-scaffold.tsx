import type { ReactNode } from 'react';

export function PageScaffold({ children }: { children: ReactNode }) {
  return <section className="space-y-6">{children}</section>;
}

export function PageSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`space-y-3 ${className}`.trim()}>{children}</div>;
}
