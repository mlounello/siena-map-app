import type { ReactNode } from 'react';

export function PageScaffold({ children }: { children: ReactNode }) {
  return <section className="page-container page-stack">{children}</section>;
}

export function PageSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`page-stack ${className}`.trim()}>{children}</div>;
}
