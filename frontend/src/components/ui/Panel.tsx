import { LucideIcon } from "lucide-react";
import { CSSProperties, ReactNode } from "react";
import { useVerticalResize } from "../../hooks/useVerticalResize";

function ResizeHandle({ onPointerDown }: { onPointerDown: (e: React.PointerEvent<HTMLElement>) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Drag to resize section"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") e.preventDefault();
      }}
      className="panel-resize-handle"
    >
      <div className="panel-resize-grip" aria-hidden="true">
        <span />
        <span />
      </div>
    </div>
  );
}

export function ScrollSection({
  header,
  children,
  className = "",
  defaultHeight = 480,
  minHeight = 160,
  contentClassName = "",
}: {
  header: ReactNode;
  children: ReactNode;
  className?: string;
  defaultHeight?: number;
  minHeight?: number;
  contentClassName?: string;
}) {
  const { height, onPointerDown } = useVerticalResize(defaultHeight, { minHeight });

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="shrink-0">{header}</div>
      <Panel noPadding className="flex flex-col overflow-hidden" style={{ height }}>
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] ${contentClassName || "p-5"}`}
        >
          {children}
        </div>
        <ResizeHandle onPointerDown={onPointerDown} />
      </Panel>
    </div>
  );
}

/** Panel with header + resizable scroll body (map sidebar drill-down). */
export function ScrollPanel({
  header,
  children,
  defaultHeight,
  minHeight = 280,
  className = "",
}: {
  header: ReactNode;
  children: ReactNode;
  defaultHeight: number;
  minHeight?: number;
  className?: string;
}) {
  const { height, onPointerDown } = useVerticalResize(defaultHeight, { minHeight });

  return (
    <Panel noPadding className={`flex flex-col overflow-hidden ${className}`} style={{ height }}>
      <div className="shrink-0">{header}</div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        {children}
      </div>
      <ResizeHandle onPointerDown={onPointerDown} />
    </Panel>
  );
}

export function Panel({
  children,
  className = "",
  noPadding = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className={`panel overflow-hidden ${className}`} style={style}>
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
