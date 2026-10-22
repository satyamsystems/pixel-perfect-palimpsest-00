import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon";
  theme?: "light" | "dark" | "auto";
  size?: 24 | 32 | 40 | 48 | 180 | number;
  className?: string;
  asLink?: boolean;
}

export function LogoMark({
  size = 32,
  theme = "auto",
  className,
}: {
  size?: number;
  theme?: "light" | "dark" | "auto";
  className?: string;
}) {
  const isLight = theme === "light";
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Trajectify.AI icon mark"
    >
      <defs>
        <linearGradient id="traj-brand-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#0B5F58" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#traj-brand-bg)" />

      {/* Trunk curve */}
      <path
        d="M6 25 C 11 23, 15 18, 18 16"
        stroke="#FAF8F4"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Upper branch */}
      <path
        d="M18 16 C 21 14, 23 9, 26 8"
        stroke="#FF6B4A"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Lower branch */}
      <path
        d="M18 16 C 21 18, 23 20, 26 21"
        stroke="#2DD4BF"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      {/* Decision node */}
      <circle cx="18" cy="16" r="2.5" fill="#FAF8F4" />
      {/* Target nodes */}
      <circle cx="26" cy="8" r="2" fill="#FF6B4A" />
      <circle cx="26" cy="21" r="1.6" fill="#2DD4BF" />
    </svg>
  );
}

export function Logo({
  variant = "full",
  theme = "auto",
  size = 32,
  className,
  asLink = true,
}: LogoProps) {
  const isLight = theme === "light";

  // Dynamic text styling based on size
  const textSizeClass =
    size >= 120 ? "text-4xl" : size >= 48 ? "text-2xl" : size <= 24 ? "text-sm" : "text-lg";

  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 select-none transition-opacity hover:opacity-90",
        className,
      )}
      title="Trajectify.AI"
    >
      <LogoMark size={size} theme={theme} />
      {variant === "full" && (
        <span
          className={cn(
            "font-display font-extrabold tracking-tight",
            textSizeClass,
            isLight ? "text-[#FAF8F4]" : "text-foreground",
          )}
        >
          Trajectify
          <span className="text-primary font-bold">.AI</span>
        </span>
      )}
    </div>
  );

  if (!asLink) {
    return content;
  }

  return (
    <Link
      to="/"
      aria-label="Trajectify.AI logo"
      className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {content}
    </Link>
  );
}
