import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  color = "var(--electric)",
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
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--muted)" strokeWidth={stroke} fill="none" />
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
        <div className="font-display text-2xl font-bold">{value}%</div>
        {label && <div className="text-xs text-muted-foreground">{label}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, action, children, className, ai }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; ai?: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={cn("card-surface lift p-5", ai && "bg-gradient-ai", className)}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function AiTag({ children = "AI generated" }: { children?: ReactNode }) {
  return (
    <span className="ai-pulse inline-flex items-center gap-1 rounded-full bg-violet/15 px-2.5 py-1 text-xs font-semibold text-violet">
      <Sparkles className="h-3 w-3" /> {children}
    </span>
  );
}

const riskStyles = {
  Low: "bg-mint/20 text-foreground",
  Medium: "bg-amber/25 text-foreground",
  High: "bg-destructive/15 text-destructive",
};
export function RiskBadge({ risk }: { risk: "Low" | "Medium" | "High" }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", riskStyles[risk])}>{risk} risk</span>;
}

const statusStyles = {
  Done: "bg-mint/20 text-foreground",
  "In progress": "bg-electric/15 text-electric",
  Upcoming: "bg-muted text-muted-foreground",
};
export function StatusChip({ status }: { status: keyof typeof statusStyles }) {
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusStyles[status])}>{status}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
