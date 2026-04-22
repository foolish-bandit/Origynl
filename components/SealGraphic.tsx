import React from 'react';

type Props = { size?: number };

export const SealGraphic: React.FC<Props> = ({ size = 320 }) => (
  <svg width={size} height={size} viewBox="0 0 320 320" style={{ display: 'block' }} aria-hidden="true">
    <defs>
      <path id="outerText" d="M 160 160 m -130 0 a 130 130 0 1 1 260 0 a 130 130 0 1 1 -260 0" />
      <path id="innerText" d="M 160 160 m -95 0 a 95 95 0 1 1 190 0 a 95 95 0 1 1 -190 0" />
    </defs>
    <g className="sealspin">
      <circle cx="160" cy="160" r="150" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <circle cx="160" cy="160" r="135" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3" strokeDasharray="1 3" />
      <text fontFamily="var(--mono)" fontSize="9" letterSpacing="4" fill="currentColor">
        <textPath href="#outerText" startOffset="0">
          · ORIGYNL · PROOF OF ORIGIN · POLYGON LEDGER · CERTIFIED AUTHENTIC · SHA-256 ·
        </textPath>
      </text>
    </g>
    <circle cx="160" cy="160" r="110" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
    <circle cx="160" cy="160" r="100" fill="var(--seal-wash)" stroke="var(--seal)" strokeWidth="1" />
    <circle cx="160" cy="160" r="70" fill="none" stroke="var(--seal)" strokeWidth="0.5" strokeDasharray="2 2" />
    {Array.from({ length: 60 }).map((_, i) => {
      const a = (i * 6) * Math.PI / 180;
      const r1 = 100;
      const r2 = i % 5 === 0 ? 94 : 97;
      return (
        <line
          key={i}
          x1={160 + Math.cos(a) * r1}
          y1={160 + Math.sin(a) * r1}
          x2={160 + Math.cos(a) * r2}
          y2={160 + Math.sin(a) * r2}
          stroke="var(--seal)"
          strokeWidth="0.5"
        />
      );
    })}
    <text x="160" y="130" textAnchor="middle" fontFamily="var(--mono)" fontSize="8" letterSpacing="3" fill="var(--ink-dim)">SEAL №</text>
    <text x="160" y="172" textAnchor="middle" fontFamily="var(--serif)" fontSize="44" fill="var(--ink)" letterSpacing="-0.02em">O.</text>
    <text x="160" y="195" textAnchor="middle" fontFamily="var(--mono)" fontSize="7" letterSpacing="2" fill="var(--ink-mute)">2026 · AMOY</text>
  </svg>
);
