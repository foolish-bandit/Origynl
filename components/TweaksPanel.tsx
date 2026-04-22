import React from 'react';
import { IconX } from './Icons';

export type Accent = 'orange' | 'blue' | 'green' | 'mono';
export type Density = 'comfy' | 'dense';

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  variant: 'A' | 'B';
  setVariant: (v: 'A' | 'B') => void;
  accent: Accent;
  setAccent: (a: Accent) => void;
  density: Density;
  setDensity: (d: Density) => void;
};

const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: 'orange', label: 'Seal', color: 'oklch(0.72 0.17 55)' },
  { id: 'blue', label: 'Signal', color: 'oklch(0.70 0.17 250)' },
  { id: 'green', label: 'Phosphor', color: 'oklch(0.78 0.18 150)' },
  { id: 'mono', label: 'None', color: 'var(--ink)' },
];

export const TweaksPanel: React.FC<Props> = ({
  open,
  setOpen,
  theme,
  setTheme,
  variant,
  setVariant,
  accent,
  setAccent,
  density,
  setDensity,
}) => {
  if (!open) return null;
  return (
    <div className="tweaks on" role="dialog" aria-label="Tweaks">
      <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Tweaks</span>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close tweaks"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-dim)' }}
        >
          <IconX size={12} />
        </button>
      </h4>
      <div className="row">
        <span className="label-sm">Theme</span>
        <div className="opt">
          <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}>Dark</button>
          <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>Light</button>
        </div>
      </div>
      <div className="row">
        <span className="label-sm">Variant</span>
        <div className="opt">
          <button className={variant === 'A' ? 'on' : ''} onClick={() => setVariant('A')}>A · Instrument</button>
          <button className={variant === 'B' ? 'on' : ''} onClick={() => setVariant('B')}>B · Monolith</button>
        </div>
      </div>
      <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
        <span className="label-sm">Accent</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAccent(a.id)}
              style={{
                border:
                  accent === a.id ? '1px solid var(--ink)' : '1px solid var(--rule)',
                padding: '8px 4px',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ width: 14, height: 14, background: a.color, borderRadius: 2 }} />
              <span className="label-sm" style={{ fontSize: 8 }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <span className="label-sm">Density</span>
        <div className="opt">
          <button className={density === 'comfy' ? 'on' : ''} onClick={() => setDensity('comfy')}>Comfy</button>
          <button className={density === 'dense' ? 'on' : ''} onClick={() => setDensity('dense')}>Dense</button>
        </div>
      </div>
    </div>
  );
};
