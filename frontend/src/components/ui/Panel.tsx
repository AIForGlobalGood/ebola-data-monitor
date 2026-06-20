import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export function Panel({
  children,
  className = "",
  noPadding = false,
}: {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div className={`panel overflow-hidden ${className}`}>
      {noPadding ? children : <div className="panel-body">{children}</div>}
    </div>
  );
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel-header flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h3 className="section-title">{title}</h3>
        {description && <p className="section-desc">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
      <h2 className="section-title">{title}</h2>
      {description && <p className="section-desc max-w-2xl">{description}</p>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "verified" | "crisis" | "caution" | "info";
}) {
  const tones = {
    default: "text-hub-muted",
    verified: "text-hub-verified",
    crisis: "text-hub-crisis",
    caution: "text-hub-caution",
    info: "text-hub-info",
  };

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-start justify-between">
        <p className="text-sm font-medium text-hub-muted">{label}</p>
        <div className={`rounded-lg bg-hub-surface p-2 ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="metric-value">{value}</p>
      {hint && <p className="mt-2 text-xs leading-relaxed text-hub-subtle">{hint}</p>}
    </div>
  );
}
