import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function AppShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`page-container page-stack ${className}`.trim()}>{children}</section>;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
      <div className="page-header-top">
        <h1 className="page-title">{title}</h1>
        {actions ? <div className="action-bar">{actions}</div> : null}
      </div>
      {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
    </header>
  );
}

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`section-card ${className}`.trim()}>
      {title || subtitle || actions ? (
        <header className="section-card-header">
          <div>
            {title ? <h2 className="section-card-title">{title}</h2> : null}
            {subtitle ? <p className="section-card-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="action-bar">{actions}</div> : null}
        </header>
      ) : null}
      <div className={`section-card-body ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}

export function Panel(props: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return <SectionCard {...props} />;
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="toolbar">{children}</div>;
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="filter-bar">{children}</div>;
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="action-bar">{children}</div>;
}

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  className = '',
  ...props
}: {
  children: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const style =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'secondary'
        ? 'btn-secondary'
        : variant === 'danger'
          ? 'btn-danger'
          : 'btn-ghost';

  return (
    <button type={type} className={`btn ${style} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <p className="text-[1.01rem] font-semibold text-[var(--heading)]">{title}</p>
      {description ? <p className="mt-1.5 text-sm">{description}</p> : null}
      {action ? <div className="mt-3 action-bar justify-center">{action}</div> : null}
    </div>
  );
}

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">{children}</table>
    </div>
  );
}

export function StatusMessage({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`status-message ${className}`.trim()}>{children}</p>;
}
