import React from 'react';
import { LogoMark, IconExt } from './Icons';

const COLUMNS = [
  { h: 'Protocol', items: ['SHA-256 Checksum', 'Polygon Amoy', 'Merkle Batching', 'EXIF Witness'] },
  { h: 'For', items: ['Legal & Discovery', 'Insurance', 'Audit & Accounting', 'Journalism'] },
  { h: 'Org', items: ['Docs', 'Changelog', 'Status', 'Contact'] },
];

export const Footer: React.FC = () => (
  <footer
    style={{
      borderTop: '1px solid var(--rule)',
      marginTop: 0,
      background: 'var(--bg)',
    }}
  >
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      <div style={{ padding: '48px 32px', borderRight: '1px solid var(--rule)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <LogoMark size={40} />
          <div
            className="serif"
            style={{ fontSize: 72, letterSpacing: '-0.04em', lineHeight: 0.9 }}
          >
            Origynl
          </div>
        </div>
        <p
          style={{
            marginTop: 24,
            color: 'var(--ink-dim)',
            maxWidth: 380,
            lineHeight: 1.6,
          }}
        >
          A forensic ledger for originals. We don't hold your documents — we hold the proof that they existed, unchanged, at a specific moment in time.
        </p>
        <div
          style={{
            marginTop: 32,
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span className="label">Contract</span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--ink)' }}>
            0x894C98bf…82C59d41
          </span>
          <a
            href="https://amoy.polygonscan.com/address/0x894C98bf09B4e9e4FEd3612803920b7d82C59d41"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            style={{
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--seal)',
              display: 'inline-flex',
              gap: 6,
              alignItems: 'center',
              fontSize: 11,
            }}
          >
            POLYGONSCAN <IconExt size={11} />
          </a>
        </div>
      </div>
      {COLUMNS.map((col) => (
        <div
          key={col.h}
          style={{ padding: '48px 32px', borderRight: '1px solid var(--rule)' }}
        >
          <div className="label" style={{ color: 'var(--seal)', marginBottom: 20 }}>
            {col.h}
          </div>
          <ul
            style={{
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {col.items.map((i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
                {i}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div
      style={{
        padding: '14px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'var(--ink-mute)',
      }}
    >
      <span>© 2026 · Origynl Labs</span>
      <span>Build v2.4.1 · Ledger OK</span>
      <span>Prototype redesign</span>
    </div>
  </footer>
);
