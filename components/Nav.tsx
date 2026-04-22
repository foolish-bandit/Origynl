import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { InstrumentBar } from './InstrumentBar';
import { LogoMark, IconArrow, IconSun, IconMoon, IconSliders } from './Icons';

type Props = {
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  variant: 'A' | 'B';
  setVariant: (v: 'A' | 'B') => void;
  openTweaks: boolean;
  setOpenTweaks: (v: boolean) => void;
};

const LINKS: { path: string; label: string; id: string }[] = [
  { path: '/', label: 'Overview', id: 'home' },
  { path: '/certify', label: 'Certify', id: 'certify' },
  { path: '/verify', label: 'Verify', id: 'verify' },
  { path: '/capture', label: 'Capture', id: 'capture' },
];

export const Nav: React.FC<Props> = ({
  theme,
  setTheme,
  variant,
  setVariant,
  openTweaks,
  setOpenTweaks,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 90,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <InstrumentBar />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'stretch',
          height: 72,
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '0 24px',
            borderRight: '1px solid var(--rule)',
          }}
        >
          <LogoMark size={28} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span className="serif" style={{ fontSize: 24, letterSpacing: '-0.03em' }}>
              Origynl
            </span>
            <span className="label-sm" style={{ marginTop: 4, fontSize: 8 }}>
              Proof-of-Origin Ledger
            </span>
          </div>
        </Link>
        <nav
          style={{
            display: 'flex',
            alignItems: 'stretch',
            borderLeft: '1px solid var(--rule)',
          }}
          aria-label="Primary"
        >
          {LINKS.map((l) => {
            const active = location.pathname === l.path;
            return (
              <Link
                key={l.id}
                to={l.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 28px',
                  borderRight: '1px solid var(--rule)',
                  fontSize: 12,
                  letterSpacing: '0.02em',
                  color: active ? 'var(--ink)' : 'var(--ink-mute)',
                  position: 'relative',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      background: 'var(--seal)',
                    }}
                  />
                )}
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            style={{
              border: 'none',
              borderLeft: '1px solid var(--rule)',
              padding: '0 18px',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--ink-dim)',
            }}
          >
            {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
          </button>
          {isHome && (
            <button
              onClick={() => setVariant(variant === 'A' ? 'B' : 'A')}
              title="Toggle visual variant"
              aria-label="Toggle home variant"
              style={{
                border: 'none',
                borderLeft: '1px solid var(--rule)',
                padding: '0 14px',
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--ink-dim)',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '0.15em',
              }}
            >
              VAR · {variant}
            </button>
          )}
          <button
            onClick={() => setOpenTweaks(!openTweaks)}
            aria-label="Toggle tweaks panel"
            style={{
              border: 'none',
              borderLeft: '1px solid var(--rule)',
              padding: '0 18px',
              cursor: 'pointer',
              background: openTweaks ? 'var(--bg-1)' : 'transparent',
              color: 'var(--ink-dim)',
            }}
          >
            <IconSliders size={16} />
          </button>
          <button
            onClick={() => navigate('/certify')}
            className="btn btn-seal"
            style={{
              borderRadius: 0,
              border: 'none',
              borderLeft: '1px solid var(--rule)',
              padding: '0 24px',
            }}
          >
            Open Ledger <IconArrow size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};
