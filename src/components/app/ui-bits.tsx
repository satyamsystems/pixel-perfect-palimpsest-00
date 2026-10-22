import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  color = "var(--primary)",
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="relative inline-grid place-items-center select-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--muted)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (value / 100) * c }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-2xl font-bold tracking-tight text-foreground">
          {value}%
        </div>
        {label && <div className="text-xs text-muted-foreground font-medium">{label}</div>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
  ai,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  ai?: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "card-surface lift p-5 transition-shadow",
        ai && "bg-gradient-ai border-primary/20",
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function AiTag({ children = "AI insight" }: { children?: ReactNode }) {
  return (
    <span className="ai-pulse inline-flex items-center gap-1.5 rounded-full bg-ai/15 px-3 py-1 text-xs font-semibold text-ai border border-ai/25">
      <Sparkles className="h-3.5 w-3.5" /> {children}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: "Low" | "Medium" | "High" }) {
  if (risk === "Low") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success border border-success/30">
        <ShieldCheck className="h-3.5 w-3.5" /> Low risk
      </span>
    );
  }
  if (risk === "Medium") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-1 text-xs font-semibold text-foreground border border-warning/40">
        <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Medium risk
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive border border-destructive/30">
      <AlertOctagon className="h-3.5 w-3.5" /> High risk
    </span>
  );
}

export function StatusChip({ status }: { status: "Done" | "In progress" | "Upcoming" }) {
  if (status === "Done") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success border border-success/30">
        <CheckCircle2 className="h-3.5 w-3.5" /> Done
      </span>
    );
  }
  if (status === "In progress") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/30">
        <Clock className="h-3.5 w-3.5" /> In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border">
      <Calendar className="h-3.5 w-3.5" /> Upcoming
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm md:text-base text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionText,
  onAction,
  actionHref,
  icon: Icon,
}: {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionHref?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="card-surface flex flex-col items-center justify-center p-8 md:p-12 text-center my-6">
      <div className="relative mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
        {Icon ? <Icon className="h-8 w-8" /> : <Sparkles className="h-8 w-8" />}
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent" />
      </div>
      <h3 className="font-display text-xl font-bold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">{description}</p>
      {actionText && (onAction || actionHref) && (
        <div className="mt-6">
          {actionHref ? (
            <a
              href={actionHref}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95"
            >
              {actionText}
            </a>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95"
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
