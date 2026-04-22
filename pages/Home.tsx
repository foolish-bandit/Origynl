import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { VariantContext } from '../components/Layout';
import { HashStrip } from '../components/HashStrip';
import { LedgerTicker } from '../components/LedgerTicker';
import { SealGraphic } from '../components/SealGraphic';
import { CertificateMock } from '../components/CertificateMock';
import { IconArrow, IconArrowDown } from '../components/Icons';

type NavFn = (path: string) => void;

const LEDGER_ROWS = [
  { who: 'Morrison LLP', file: 'Settlement_Final.pdf', hash: 'a8f3b2c94e71…4e71', t: '12s', live: false },
  { who: 'Allstate Claim', file: 'storm_damage_03.jpg', hash: '7d21ab009f43…9f43', t: '41s', live: true },
  { who: 'Baker Audit Co.', file: 'Q4_workpapers.xlsx', hash: 'c2e5f7811a09…1a09', t: '1m', live: false },
  { who: 'J. Chen', file: 'invention_v2.pdf', hash: '12f980abbbcc…bbcc', t: '2m', live: false },
  { who: 'Reuters Desk 41', file: 'source_docs.zip', hash: 'ff21cc900013…0013', t: '3m', live: false },
];

/* =========== HOME · VARIANT A — Instrument =========== */
function HomeA({ go }: { go: NavFn }) {
  return (
    <div>
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 440px', minHeight: 620 }}>
        <div
          style={{
            padding: '80px 48px 48px',
            borderRight: '1px solid var(--rule)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 40, flexWrap: 'wrap' }}>
              <span className="label">Filed 04 · 20 · 2026</span>
              <span style={{ width: 24, height: 1, background: 'var(--rule)' }} />
              <span className="label">Volume II · Issue 14</span>
              <span style={{ width: 24, height: 1, background: 'var(--rule)' }} />
              <span className="label" style={{ color: 'var(--seal)' }}>PROTOTYPE</span>
            </div>
            <h1
              className="serif"
              style={{
                fontSize: 'clamp(56px, 8vw, 128px)',
                lineHeight: 1.02,
                letterSpacing: '-0.035em',
              }}
            >
              The original<br />
              is <em style={{ fontStyle: 'italic' }}>the one</em> recorded<br />
              on the chain.
            </h1>
            <p
              style={{
                maxWidth: 520,
                fontSize: 17,
                color: 'var(--ink-dim)',
                marginTop: 36,
                lineHeight: 1.55,
              }}
            >
              Origynl notarizes a file the moment it exists. The document never leaves your device — only its cryptographic fingerprint is inscribed into a public, immutable ledger. If someone disputes your version later, the chain is your witness.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 48, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => go('/certify')} className="btn btn-seal">
              Certify a document <IconArrow size={14} />
            </button>
            <button onClick={() => go('/verify')} className="btn">
              Verify a file
            </button>
            <span style={{ flex: 1 }} />
            <a
              href="#protocol"
              className="btn btn-ghost"
              style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.15em' }}
            >
              READ THE PROTOCOL <IconArrowDown size={12} />
            </a>
          </div>
        </div>
        <aside
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            background: 'var(--bg-1)',
          }}
        >
          <div className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Live Ledger</span>
            <span style={{ color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                className="pulsedot"
                style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)' }}
              />
              STREAMING
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {LEDGER_ROWS.map((r, i) => (
              <div
                key={i}
                style={{
                  padding: '14px 0',
                  borderBottom: '1px solid var(--rule)',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  rowGap: 4,
                  columnGap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {r.live && (
                    <span
                      className="label-sm"
                      style={{
                        color: 'var(--seal)',
                        fontSize: 8,
                        padding: '1px 5px',
                        border: '1px solid var(--seal)',
                      }}
                    >
                      LIVE
                    </span>
                  )}
                  {r.who}
                </div>
                <div className="label-sm" style={{ textAlign: 'right' }}>{r.t} ago</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)', gridColumn: '1 / -1' }}>
                  {r.file}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)', gridColumn: '1 / -1' }}>
                  {r.hash}
                </div>
              </div>
            ))}
          </div>
          <div className="label-sm" style={{ textAlign: 'center', color: 'var(--ink-faint)' }}>
            144,219 ORIGINALS ON CHAIN · 2.1M SINCE GENESIS
          </div>
        </aside>
      </section>

      <section
        style={{
          padding: '16px 48px',
          background: 'var(--bg-1)',
          borderTop: '1px solid var(--rule)',
          borderBottom: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <span className="label">Sample Fingerprint · SHA-256</span>
        <HashStrip />
      </section>

      <LedgerTicker />

      <section id="protocol" style={{ padding: '96px 48px 48px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48 }}>
          <div>
            <div className="label" style={{ color: 'var(--seal)' }}>§ 01</div>
            <div
              className="serif"
              style={{ fontSize: 28, letterSpacing: '-0.02em', marginTop: 12, lineHeight: 1.05 }}
            >
              The<br />problem<br />with now.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
            <div>
              <p style={{ fontSize: 18, lineHeight: 1.5, color: 'var(--ink)' }}>
                Generative models have made every image, every contract, every recording, <em>deniable</em>. A forged invoice costs nothing. A backdated agreement takes thirty seconds. "Check the metadata" is no longer a defense.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                ['Metadata', 'Editable in seconds'],
                ['File timestamps', 'Trivially overwritten'],
                ['Email signatures', 'Accounts get compromised'],
                ['Notary stamp', 'Proves who signed, not when'],
                ['Digital signatures', 'Can be attached to forgeries'],
              ].map(([a, b], i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    gap: 16,
                    padding: '12px 0',
                    borderBottom: '1px solid var(--rule)',
                  }}
                >
                  <span style={{ fontSize: 14, color: 'var(--ink)' }}>{a}</span>
                  <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>→</span>
                  <span style={{ fontSize: 13, color: 'var(--bad)' }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          padding: '96px 48px',
          borderBottom: '1px solid var(--rule)',
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: 80,
          alignItems: 'center',
        }}
      >
        <div>
          <div className="label" style={{ color: 'var(--seal)' }}>§ 02</div>
          <h2
            className="serif"
            style={{ fontSize: 72, letterSpacing: '-0.03em', marginTop: 16, lineHeight: 1.02 }}
          >
            A timestamp<br />that can't be<br />
            <em style={{ color: 'var(--seal)' }}>un-made</em>.
          </h2>
          <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {[
              { k: 'WHEN', v: 'The exact block the file was witnessed.' },
              { k: 'WHAT', v: 'A hash unique to the contents, bit-for-bit.' },
              { k: 'WHO', v: 'The signer address that paid to inscribe it.' },
              { k: 'WHERE', v: 'Optional GPS / sensor telemetry on live captures.' },
            ].map((c) => (
              <div
                key={c.k}
                style={{ padding: 20, border: '1px solid var(--rule)', background: 'var(--bg-1)' }}
              >
                <div className="label" style={{ color: 'var(--seal)' }}>{c.k}</div>
                <p style={{ marginTop: 12, fontSize: 14, color: 'var(--ink-dim)' }}>{c.v}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--ink-dim)' }}>
          <SealGraphic size={320} />
        </div>
      </section>

      <section style={{ padding: '96px 48px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48, marginBottom: 48 }}>
          <div>
            <div className="label" style={{ color: 'var(--seal)' }}>§ 03</div>
            <div
              className="serif"
              style={{ fontSize: 28, letterSpacing: '-0.02em', marginTop: 12, lineHeight: 1.05 }}
            >
              The<br />procedure.
            </div>
          </div>
          <p style={{ fontSize: 20, lineHeight: 1.5, color: 'var(--ink-dim)', maxWidth: 720 }}>
            Three operations. The file never uploads. You receive a signed certificate and a publicly-verifiable block reference.
          </p>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderTop: '1px solid var(--rule)',
            borderLeft: '1px solid var(--rule)',
          }}
        >
          {[
            {
              n: '01',
              t: 'Hash',
              d: 'Your file is passed through SHA-256 locally in the browser. The output is a 64-character fingerprint. Nothing leaves your machine.',
              tech: 'crypto.subtle.digest("SHA-256")',
            },
            {
              n: '02',
              t: 'Inscribe',
              d: 'The hash is written to the OrigynlLedger contract on Polygon. Duplicate hashes are rejected by the contract itself.',
              tech: 'function certify(string hash) external',
            },
            {
              n: '03',
              t: 'Issue',
              d: 'You receive a PDF certificate, a public verification URL, and — for images — a watermarked copy with the hash embedded as EXIF.',
              tech: 'Certificate · PDF · pkcs7',
            },
          ].map((s) => (
            <div
              key={s.n}
              style={{
                padding: 32,
                borderRight: '1px solid var(--rule)',
                borderBottom: '1px solid var(--rule)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                minHeight: 280,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span
                  className="serif"
                  style={{
                    fontSize: 96,
                    letterSpacing: '-0.04em',
                    color: 'var(--ink-faint)',
                    lineHeight: 0.8,
                  }}
                >
                  {s.n}
                </span>
                <span className="label-sm" style={{ color: 'var(--seal)' }}>STEP</span>
              </div>
              <h3 className="serif" style={{ fontSize: 32, letterSpacing: '-0.02em' }}>{s.t}</h3>
              <p style={{ color: 'var(--ink-dim)', fontSize: 14, flex: 1 }}>{s.d}</p>
              <code
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--ink-faint)',
                  padding: '8px 10px',
                  background: 'var(--bg-2)',
                  borderLeft: '2px solid var(--seal)',
                }}
              >
                {s.tech}
              </code>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '96px 48px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48 }}>
          <div>
            <div className="label" style={{ color: 'var(--seal)' }}>§ 04</div>
            <div
              className="serif"
              style={{ fontSize: 28, letterSpacing: '-0.02em', marginTop: 12, lineHeight: 1.05 }}
            >
              On the<br />record.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {[
              {
                h: 'Counsel & Discovery',
                items: [
                  'Executed agreement timestamps',
                  'Evidence preservation on receipt',
                  'Settlement records',
                  'Chain of custody',
                ],
              },
              {
                h: 'Insurance Claims',
                items: [
                  'First-notice damage photos',
                  'Live-witnessed inspections',
                  'Report authenticity',
                  'Pre/post-incident imagery',
                ],
              },
              {
                h: 'Audit & Finance',
                items: [
                  'Period-end lockdown',
                  'Workpaper integrity',
                  'Transaction ledgers',
                  'Compliance artefacts',
                ],
              },
              {
                h: 'Newsroom & Research',
                items: [
                  'Source document provenance',
                  'Field recording attestation',
                  'Leaked-document intake',
                  'Published version proof',
                ],
              },
            ].map((col, i) => (
              <div
                key={col.h}
                style={{
                  padding: 24,
                  borderTop: '1px solid var(--rule)',
                  borderLeft: i % 2 === 0 ? '1px solid var(--rule)' : 'none',
                  borderRight: '1px solid var(--rule)',
                  borderBottom: '1px solid var(--rule)',
                }}
              >
                <h4
                  className="serif"
                  style={{ fontSize: 22, letterSpacing: '-0.02em', marginBottom: 12 }}
                >
                  {col.h}
                </h4>
                <ul style={{ listStyle: 'none' }}>
                  {col.items.map((item) => (
                    <li
                      key={item}
                      style={{
                        display: 'flex',
                        gap: 10,
                        padding: '6px 0',
                        fontSize: 13,
                        color: 'var(--ink-dim)',
                      }}
                    >
                      <span style={{ color: 'var(--seal)' }}>—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: '112px 48px', textAlign: 'center', background: 'var(--bg-1)' }}>
        <div className="label" style={{ color: 'var(--seal)' }}>OPEN LEDGER</div>
        <h2
          className="serif"
          style={{
            fontSize: 'clamp(56px, 7vw, 112px)',
            letterSpacing: '-0.035em',
            marginTop: 16,
            lineHeight: 1.02,
          }}
        >
          Inscribe your<br />first original.
        </h2>
        <p style={{ color: 'var(--ink-dim)', maxWidth: 520, margin: '32px auto', fontSize: 16 }}>
          Fully functional prototype. Certify any file on Polygon Amoy in under a minute. No account required.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => go('/certify')} className="btn btn-seal">
            Begin certification <IconArrow size={14} />
          </button>
          <button onClick={() => go('/verify')} className="btn">
            Or verify a file
          </button>
        </div>
      </section>
    </div>
  );
}

/* =========== HOME · VARIANT B — Monolith =========== */
function HomeB({ go }: { go: NavFn }) {
  return (
    <div>
      <section
        style={{
          minHeight: 720,
          padding: '64px 32px',
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(var(--rule) 1px, transparent 1px), linear-gradient(90deg, var(--rule) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            opacity: 0.2,
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 1040 }}>
          <div className="label" style={{ color: 'var(--seal)', marginBottom: 28 }}>
            A NOTARY FOR THE POST-GENERATIVE ERA
          </div>
          <h1
            className="serif"
            style={{
              fontSize: 'clamp(72px, 12vw, 200px)',
              letterSpacing: '-0.045em',
              lineHeight: 1.02,
            }}
          >
            Prove<br />
            <em style={{ fontStyle: 'italic' }}>it was</em>
            <br />yours.
          </h1>
          <p
            style={{
              marginTop: 40,
              maxWidth: 560,
              marginLeft: 'auto',
              marginRight: 'auto',
              fontSize: 18,
              color: 'var(--ink-dim)',
              lineHeight: 1.55,
            }}
          >
            Origynl inscribes the fingerprint of a file onto a public blockchain. The original is whichever version was recorded first. Everything else is a copy.
          </p>
          <div
            style={{
              marginTop: 48,
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button onClick={() => go('/certify')} className="btn btn-ink">
              Certify now <IconArrow size={14} />
            </button>
            <button onClick={() => go('/verify')} className="btn">Verify</button>
          </div>
        </div>
      </section>

      <section
        style={{
          padding: '64px 48px',
          borderTop: '1px solid var(--rule)',
          borderBottom: '1px solid var(--rule)',
          background: 'var(--bg-1)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div className="label" style={{ color: 'var(--seal)' }}>WHAT YOU GET</div>
            <h2
              className="serif"
              style={{
                fontSize: 72,
                letterSpacing: '-0.03em',
                marginTop: 16,
                lineHeight: 1.02,
              }}
            >
              A signed<br />certificate.<br />Every time.
            </h2>
            <p style={{ marginTop: 28, color: 'var(--ink-dim)', fontSize: 16, lineHeight: 1.55 }}>
              A PDF — deposition-ready, print-ready — with the block height, transaction hash, and file fingerprint. Anyone with the file can independently verify it against the public Polygon ledger.
            </p>
            <div
              style={{
                marginTop: 32,
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 10,
                rowGap: 8,
              }}
            >
              {[
                ['01', 'Issued the moment certification completes.'],
                ['02', 'Holds the transaction URL on PolygonScan.'],
                ['03', 'Re-verifiable without Origynl existing.'],
              ].map(([a, b]) => (
                <React.Fragment key={a}>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--seal)' }}>{a}</span>
                  <span style={{ fontSize: 14, color: 'var(--ink)' }}>{b}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div>
            <CertificateMock />
          </div>
        </div>
      </section>

      <LedgerTicker />

      <section style={{ padding: '96px 48px', borderBottom: '1px solid var(--rule)' }}>
        <div className="label" style={{ color: 'var(--seal)', marginBottom: 16 }}>HOW</div>
        <h2
          className="serif"
          style={{
            fontSize: 80,
            letterSpacing: '-0.035em',
            lineHeight: 1.02,
            maxWidth: 1000,
          }}
        >
          Hash locally.<br />
          Inscribe on-chain.<br />
          <em style={{ color: 'var(--seal)' }}>Receive the seal.</em>
        </h2>
        <div
          style={{
            marginTop: 64,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0,
            borderTop: '1px solid var(--rule)',
          }}
        >
          {[
            { n: '01', t: 'Drop any file', d: 'PDF, image, DOCX, zip. Your file never uploads.' },
            { n: '02', t: 'We fingerprint it', d: 'A 64-character SHA-256 hash is computed in-browser.' },
            { n: '03', t: 'Chain records it', d: 'Hash + timestamp are inscribed to Polygon. Permanent.' },
          ].map((s, i) => (
            <div
              key={s.n}
              style={{ padding: 32, borderRight: i < 2 ? '1px solid var(--rule)' : 'none' }}
            >
              <span
                className="mono"
                style={{ fontSize: 11, color: 'var(--seal)', letterSpacing: '0.2em' }}
              >
                STEP {s.n}
              </span>
              <h3
                className="serif"
                style={{ fontSize: 36, letterSpacing: '-0.02em', margin: '12px 0' }}
              >
                {s.t}
              </h3>
              <p style={{ color: 'var(--ink-dim)', fontSize: 14 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '96px 48px', borderBottom: '1px solid var(--rule)' }}>
        <div className="label" style={{ color: 'var(--seal)', marginBottom: 16 }}>WHO USES IT</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 24,
            marginTop: 32,
          }}
        >
          {[
            'Counsel & Discovery',
            'Insurance Claims',
            'Audit & Finance',
            'Newsroom & Research',
          ].map((h) => (
            <div key={h} style={{ padding: '24px 0', borderTop: '2px solid var(--ink)' }}>
              <h3 className="serif" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
                {h}
              </h3>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '128px 48px', textAlign: 'center', background: 'var(--bg-1)' }}>
        <h2
          className="serif"
          style={{
            fontSize: 'clamp(64px, 9vw, 144px)',
            letterSpacing: '-0.04em',
            lineHeight: 1.02,
          }}
        >
          Your original<br />has a witness now.
        </h2>
        <div style={{ marginTop: 40 }}>
          <button
            onClick={() => go('/certify')}
            className="btn btn-ink"
            style={{ padding: '18px 32px' }}
          >
            Begin <IconArrow size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}

export const Home: React.FC = () => {
  const { variant } = useContext(VariantContext);
  const navigate = useNavigate();
  const go: NavFn = (p) => navigate(p);
  return variant === 'A' ? <HomeA go={go} /> : <HomeB go={go} />;
};
