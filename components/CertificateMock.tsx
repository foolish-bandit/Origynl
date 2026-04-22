import React from 'react';
import { SealGraphic } from './SealGraphic';

export const CertificateMock: React.FC = () => (
  <div
    style={{
      background: 'var(--bg)',
      border: '1px solid var(--rule)',
      padding: 32,
      position: 'relative',
      boxShadow: '0 30px 60px rgba(0,0,0,.25)',
      aspectRatio: '3/4',
    }}
  >
    <div
      style={{ position: 'absolute', inset: 16, border: '1px solid var(--rule)', pointerEvents: 'none' }}
    />
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="label-sm">Certificate of Origin</span>
          <div className="serif" style={{ fontSize: 36, letterSpacing: '-0.02em', marginTop: 8 }}>
            Origynl.
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="label-sm">Seal №</span>
          <div className="mono" style={{ fontSize: 13, marginTop: 4 }}>14,219</div>
        </div>
      </div>
      <div style={{ marginTop: 36, fontSize: 13, color: 'var(--ink)', lineHeight: 1.7 }}>
        Be it known that the file identified below was inscribed upon the Polygon public ledger and bears its timestamp as witness.
      </div>
      <dl className="kv" style={{ marginTop: 28, fontSize: 11 }}>
        <dt>FILE</dt><dd>Settlement_Final_v3.pdf</dd>
        <dt>SHA-256</dt>
        <dd style={{ wordBreak: 'break-all' }}>
          a8f3b2c94e71d21ab009f43c2e5f7811a09ff21cc9000131a2b3c4d5500abef7
        </dd>
        <dt>TX</dt>
        <dd style={{ color: 'var(--seal)' }}>0x7d21ab00…9f43</dd>
        <dt>BLOCK</dt><dd>#58,234,007</dd>
        <dt>ISSUED</dt><dd>20 Apr 2026 · 14:32:11 UTC</dd>
        <dt>SIGNER</dt><dd>0x4e71a8f3…b2c9</dd>
      </dl>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div
          style={{
            color: 'var(--ink-dim)',
            fontSize: 10,
            fontFamily: 'var(--mono)',
            letterSpacing: '0.1em',
          }}
        >
          <div>Verify at</div>
          <div style={{ color: 'var(--ink)' }}>origynl.app/v/0x7d21…9f43</div>
        </div>
        <div style={{ color: 'var(--ink-dim)' }}>
          <SealGraphic size={88} />
        </div>
      </div>
    </div>
  </div>
);
