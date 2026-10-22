import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden>
      <defs>
        <linearGradient id="lg-mark" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="var(--electric)" />
          <stop offset="1" stopColor="var(--violet)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lg-mark)" />
      <path d="M6 24 C 12 22, 14 16, 18 14" stroke="var(--on-dark)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M18 14 C 21 12, 23 8, 26 7" stroke="var(--mint)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M18 14 C 21 15, 23 17, 26 17" stroke="var(--on-dark)" strokeOpacity="0.6" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="18" cy="14" r="2.2" fill="var(--on-dark)" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Trajectify.AI home">
      <LogoMark />
      <span className={cn("font-display text-lg font-bold tracking-tight", light ? "text-on-dark" : "text-foreground")}>
        Trajectify<span className="text-violet">.AI</span>
      </span>
    </Link>
  );
}
