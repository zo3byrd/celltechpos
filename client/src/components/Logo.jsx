import { useId } from 'react';

export default function CellTechLogo({ height = 38 }) {
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      viewBox="0 0 172 46"
      height={height}
      style={{ display: 'block', overflow: 'visible' }}
      aria-label="CellTechPOS"
    >
      <defs>
        <linearGradient id={`${uid}-ph`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id={`${uid}-ct`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id={`${uid}-txt`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
        <linearGradient id={`${uid}-screen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
      </defs>

      {/* ── Smartphone (left icon) ── */}
      <rect x="0" y="2" width="14" height="28" rx="3" fill={`url(#${uid}-ph)`} />
      <rect x="1.5" y="5" width="11" height="20" rx="1.5" fill={`url(#${uid}-screen)`} />
      <text x="4" y="17" fontFamily="Arial" fontSize="10" fontWeight="900" fill="#34d399">$</text>
      <rect x="3" y="19" width="8" height="1.3" rx="0.65" fill="#34d399" opacity="0.6" />
      <rect x="3" y="21.2" width="5.5" height="1.3" rx="0.65" fill="#34d399" opacity="0.35" />
      <rect x="4.5" y="27" width="5" height="1.2" rx="0.6" fill="white" opacity="0.3" />
      <rect x="4.5" y="3.5" width="5" height="0.9" rx="0.45" fill="white" opacity="0.2" />

      {/* ── Credit card terminal (right icon) ── */}
      <rect x="17" y="6" width="15" height="22" rx="2.5" fill={`url(#${uid}-ct)`} />
      <rect x="19" y="8" width="11" height="7" rx="1.2" fill={`url(#${uid}-screen)`} />
      <rect x="20.5" y="9.5"  width="7" height="1.1" rx="0.55" fill="#38bdf8" opacity="0.7" />
      <rect x="20.5" y="11.5" width="5" height="1.1" rx="0.55" fill="#38bdf8" opacity="0.45" />
      {[0,1,2].map(col => [0,1,2].map(row => (
        <circle
          key={`${col}-${row}`}
          cx={20.5 + col * 3.5}
          cy={17.5 + row * 3}
          r="1.1"
          fill={row === 2 && col === 1 ? '#34d399' : '#e0f2fe'}
          opacity={row === 2 && col === 1 ? 0.9 : 0.65}
        />
      )))}
      <rect x="19" y="26.5" width="11" height="1.2" rx="0.6" fill="white" opacity="0.3" />

      {/* ── Connector ── */}
      <text x="14.5" y="20" fontFamily="Arial" fontSize="8" fontWeight="900" fill="#fbbf24" opacity="0.85">⚡</text>

      {/* ── CELLTECH text ── */}
      <text
        x="38"
        y="22"
        fontFamily="'Arial Black', 'Arial Bold', Arial, sans-serif"
        fontWeight="900"
        fontSize="17"
        fill={`url(#${uid}-txt)`}
        letterSpacing="-0.3"
      >CELLTECH</text>

      {/* ── — POS — ── */}
      <line x1="61" y1="33.5" x2="69" y2="33.5" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
      <text
        x="85"
        y="37"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontWeight="800"
        fontSize="11"
        fill="#38bdf8"
        letterSpacing="3.5"
      >POS</text>
      <line x1="101" y1="33.5" x2="109" y2="33.5" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
