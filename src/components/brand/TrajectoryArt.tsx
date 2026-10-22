import { motion } from "framer-motion";

/** Glowing path that splits into branching possible futures. */
export function TrajectoryArt({ className }: { className?: string }) {
  const branches = [
    { d: "M260 250 C 330 200, 380 120, 470 70", color: "var(--mint)", label: "Full-Stack Dev · 78%", y: 62 },
    { d: "M260 250 C 340 240, 390 200, 470 180", color: "var(--electric)", label: "Data Science · 61%", y: 172 },
    { d: "M260 250 C 340 280, 390 320, 470 310", color: "var(--amber)", label: "Placements · 69%", y: 302 },
  ];
  return (
    <svg viewBox="0 0 560 380" className={className} role="img" aria-label="A trajectory path branching into three possible futures">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="trunk" x1="0" x2="1">
          <stop offset="0" stopColor="var(--electric)" stopOpacity="0.2" />
          <stop offset="1" stopColor="var(--violet)" />
        </linearGradient>
      </defs>
      {[60, 140, 220, 300].map((y) => (
        <line key={y} x1="20" x2="540" y1={y} y2={y} stroke="var(--on-dark)" strokeOpacity="0.06" />
      ))}
      <path d="M30 330 C 110 320, 180 290, 260 250" stroke="url(#trunk)" strokeWidth="5" fill="none" strokeLinecap="round" filter="url(#glow)" className="draw-path" />
      {branches.map((b, i) => (
        <g key={b.label}>
          <motion.path
            d={b.d}
            stroke={b.color}
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            filter="url(#glow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 1.2 + i * 0.25, duration: 1.4, ease: "easeOut" }}
          />
          <motion.g initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.4 + i * 0.2 }}>
            <circle cx="470" cy={b.y + 8} r="6" fill={b.color} filter="url(#glow)" />
            <text x="484" y={b.y + 4} fill="var(--on-dark)" fontSize="11" fontWeight="600" fontFamily="var(--font-sans)">
              {b.label.split(" · ")[0]}
            </text>
            <text x="484" y={b.y + 19} fill={b.color} fontSize="11" fontWeight="700" fontFamily="var(--font-sans)">
              {b.label.split(" · ")[1]} likely
            </text>
          </motion.g>
        </g>
      ))}
      <circle cx="30" cy="330" r="6" fill="var(--electric)" />
      <text x="20" y="358" fill="var(--on-dark)" fillOpacity="0.7" fontSize="11" fontFamily="var(--font-sans)">You, today</text>
      <circle cx="260" cy="250" r="8" fill="var(--on-dark)" className="ai-pulse" filter="url(#glow)" />
    </svg>
  );
}
