import React from 'react';

type Row = { h: string; who: string; what: string; t: string; live?: boolean };

const DEFAULT_ROWS: Row[] = [
  { h: 'a8f3b2c9…4e71', who: 'Morrison LLP', what: 'Settlement Agr.', t: '12s ago' },
  { h: '7d21ab00…9f43', who: 'Allstate Claim', what: 'Damage Photo', t: '41s ago', live: true },
  { h: 'c2e5f781…1a09', who: 'Baker Audit Co.', what: 'Q4 Filing', t: '1m ago' },
  { h: '12f980ab…bbcc', who: 'J. Chen', what: 'Invention Disc.', t: '2m ago' },
  { h: 'ff21cc90…0013', who: 'Reuters', what: 'Source Doc', t: '3m ago' },
  { h: '5500abef…7711', who: 'Perkins Coie', what: 'NDA Executed', t: '4m ago' },
  { h: '9a7c1122…0af1', who: 'Anon (0x4e…)', what: 'Image / 4.2MB', t: '5m ago' },
  { h: '1a2b3c4d…5e6f', who: 'Travelers Ins.', what: 'Claim Form', t: '6m ago' },
];

export const LedgerTicker: React.FC<{ rows?: Row[] }> = ({ rows = DEFAULT_ROWS }) => {
  const doubled = [...rows, ...rows];
  return (
    <div
      style={{
        overflow: 'hidden',
        borderTop: '1px solid var(--rule)',
        borderBottom: '1px solid var(--rule)',
        background: 'var(--bg-1)',
        maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
      }}
    >
      <div className="ticker-track" style={{ display: 'flex', width: 'max-content', gap: 0 }}>
        {doubled.map((r, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto auto',
              gap: 14,
              alignItems: 'center',
              padding: '10px 20px',
              borderRight: '1px solid var(--rule)',
              minWidth: 380,
              fontFamily: 'var(--mono)',
              fontSize: 11,
            }}
          >
            {r.live ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: 'var(--seal)',
                  fontSize: 9,
                  letterSpacing: '0.15em',
                }}
              >
                <span
                  className="pulsedot"
                  style={{ width: 6, height: 6, background: 'var(--seal)', borderRadius: '50%' }}
                />
                LIVE
              </span>
            ) : (
              <span style={{ color: 'var(--ink-mute)', fontSize: 9, letterSpacing: '0.15em' }}>CERT</span>
            )}
            <span style={{ color: 'var(--ink-dim)' }}>{r.h}</span>
            <span style={{ color: 'var(--ink)', fontSize: 11 }}>{r.what}</span>
            <span style={{ color: 'var(--ink-mute)', fontSize: 10 }}>{r.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
