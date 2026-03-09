import type { ReactNode } from 'react';

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
    <header className="space-y-2">
      {eyebrow ? <p className="siena-eyebrow">{eyebrow}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="siena-title">{title}</h1>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {subtitle ? <p className="siena-subtitle max-w-3xl">{subtitle}</p> : null}
    </header>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`siena-panel ${className}`.trim()}>
      {title ? <h2 className="siena-panel-title">{title}</h2> : null}
      {subtitle ? <p className="siena-panel-subtitle">{subtitle}</p> : null}
      {children}
    </section>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="siena-toolbar">{children}</div>;
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
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'siena-btn';
  const style =
    variant === 'primary'
      ? 'siena-btn-primary'
      : variant === 'secondary'
        ? 'siena-btn-secondary'
        : variant === 'danger'
          ? 'siena-btn-danger'
          : 'siena-btn-ghost';

  return (
    <button type={type} className={`${base} ${style} ${className}`.trim()} {...props}>
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
  return <span className={`siena-badge siena-badge-${tone}`}>{label}</span>;
}
