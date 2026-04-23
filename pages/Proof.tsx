import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { findRecordByHashDetailed, CONTRACT_ADDRESS } from '../services/chainService';
import { HashStrip } from '../components/HashStrip';
import { SealGraphic } from '../components/SealGraphic';
import { IconArrow, IconCheck, IconCopy, IconExt, IconX } from '../components/Icons';
import { ChainRecord } from '../types';

type State =
  | { kind: 'loading' }
  | { kind: 'found'; record: ChainRecord }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string }
  | { kind: 'invalid' };

function shortHash(h?: string | null, tailLen = 4): string {
  if (!h) return '—';
  const clean = h.replace(/^0x/, '');
  if (clean.length <= 14) return h;
  return `${h.slice(0, 12)}…${clean.slice(-tailLen)}`;
}

export const Proof: React.FC = () => {
  const params = useParams<{ id: string }>();
  const id = (params.id ?? '').trim();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setState({ kind: 'invalid' });
        return;
      }
      const looksValid =
        /^[a-f0-9]{64}$/i.test(id) || (id.startsWith('0x') && id.length === 66);
      if (!looksValid) {
        setState({ kind: 'invalid' });
        return;
      }
      setState({ kind: 'loading' });
      const result = await findRecordByHashDetailed(id);
      if (cancelled) return;
      if (result.status === 'found') setState({ kind: 'found', record: result.record });
      else if (result.status === 'not_found') setState({ kind: 'not_found' });
      else setState({ kind: 'error', message: result.error });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop — older browsers */
    }
  };

  return (
    <div style={{ padding: '64px 48px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 40 }}>
        <div className="label" style={{ color: 'var(--seal)' }}>
          § PROOF · SHAREABLE RECORD
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(44px, 6vw, 88px)',
            letterSpacing: '-0.035em',
            lineHeight: 1.02,
            marginTop: 12,
          }}
        >
          Proof of origin
        </h1>
        <p style={{ marginTop: 16, color: 'var(--ink-dim)', maxWidth: 560 }}>
          Anyone can verify this record independently by querying the OrigynlLedger contract on
          Polygon Amoy. No login. No trust in Origynl. The chain is the receipt.
        </p>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {state.kind === 'loading' && (
          <div style={{ padding: 64, border: '1px solid var(--rule)', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-block',
                width: 48,
                height: 48,
                border: '1px solid var(--rule)',
                borderTopColor: 'var(--seal)',
                borderRadius: '50%',
                animation: 'sealspin 1s linear infinite',
              }}
              aria-hidden="true"
            />
            <div className="label" style={{ marginTop: 20 }}>
              Querying ledger…
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 6 }}>
              {shortHash(id)}
            </div>
          </div>
        )}

        {state.kind === 'invalid' && (
          <div style={{ border: '2px solid var(--bad)', padding: 48 }}>
            <div className="label" style={{ color: 'var(--bad)', marginBottom: 16 }}>
              MALFORMED IDENTIFIER
            </div>
            <p style={{ color: 'var(--ink-dim)', maxWidth: 560 }}>
              Proof URLs accept either a 64-character SHA-256 hash or an 0x-prefixed Polygon
              transaction id. Got: <code className="mono">{id || '(empty)'}</code>
            </p>
            <div style={{ marginTop: 24 }}>
              <Link className="btn btn-seal" to="/verify">
                Go to Verify <IconArrow size={14} />
              </Link>
            </div>
          </div>
        )}

        {state.kind === 'not_found' && (
          <div style={{ border: '2px solid var(--bad)', padding: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <IconX size={22} stroke={2.5} style={{ color: 'var(--bad)' }} />
              <span className="label" style={{ color: 'var(--bad)' }}>
                NO RECORD · FINGERPRINT NOT ON LEDGER
              </span>
            </div>
            <p style={{ color: 'var(--ink-dim)', maxWidth: 560 }}>
              This identifier does not correspond to any certification written to the OrigynlLedger
              contract.
            </p>
            <dl className="kv" style={{ marginTop: 24 }}>
              <dt>LOOKED UP</dt>
              <dd style={{ wordBreak: 'break-all', color: 'var(--bad)' }}>{id}</dd>
            </dl>
          </div>
        )}

        {state.kind === 'error' && (
          <div style={{ border: '2px solid var(--bad)', padding: 48 }}>
            <div className="label" style={{ color: 'var(--bad)', marginBottom: 16 }}>
              ERROR · CHAIN LOOKUP FAILED
            </div>
            <p style={{ color: 'var(--ink-dim)', maxWidth: 560 }}>{state.message}</p>
          </div>
        )}

        {state.kind === 'found' && (
          <div style={{ border: '2px solid var(--ok)', background: 'var(--bg-1)' }}>
            <div
              style={{
                padding: '16px 24px',
                borderBottom: '1px solid var(--rule)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'color-mix(in oklch, var(--ok) 10%, var(--bg-1))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <IconCheck size={18} stroke={2.5} style={{ color: 'var(--ok)' }} />
                <span className="label" style={{ color: 'var(--ok)' }}>
                  AUTHENTIC · ON-CHAIN RECORD
                </span>
              </div>
              <button className="btn btn-ghost" onClick={copyUrl} aria-label="Copy proof URL">
                <IconCopy size={14} /> {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            <div
              style={{
                padding: 40,
                display: 'grid',
                gridTemplateColumns: '1fr 260px',
                gap: 48,
              }}
            >
              <div>
                <dl className="kv">
                  <dt>FILE</dt>
                  <dd>{state.record.fileName || 'On-chain record'}</dd>
                  <dt>FINGERPRINT</dt>
                  <dd style={{ wordBreak: 'break-all' }}>{state.record.hash}</dd>
                  <dt>TX</dt>
                  <dd style={{ color: 'var(--seal)' }}>
                    {state.record.txHash ? (
                      <a
                        href={`https://amoy.polygonscan.com/tx/${state.record.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--seal)' }}
                      >
                        {shortHash(state.record.txHash)}{' '}
                        <IconExt size={10} style={{ verticalAlign: 'middle' }} />
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                  <dt>BLOCK</dt>
                  <dd>
                    {state.record.blockHeight
                      ? `#${state.record.blockHeight.toLocaleString()}`
                      : '—'}
                  </dd>
                  <dt>SIGNER</dt>
                  <dd>{shortHash(state.record.sender)}</dd>
                  <dt>WITNESSED</dt>
                  <dd>
                    {new Date(state.record.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                    Z
                  </dd>
                  <dt>TIER</dt>
                  <dd style={{ color: 'var(--seal)' }}>
                    {state.record.provenanceType === 'LIVE_CAPTURE'
                      ? 'LIVE CAPTURE · sensor bound'
                      : 'STANDARD · file hash'}
                  </dd>
                  <dt>CONTRACT</dt>
                  <dd>
                    <a
                      href={`https://amoy.polygonscan.com/address/${CONTRACT_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--seal)' }}
                    >
                      {shortHash(CONTRACT_ADDRESS)}{' '}
                      <IconExt size={10} style={{ verticalAlign: 'middle' }} />
                    </a>
                  </dd>
                </dl>
                <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {state.record.txHash && (
                    <a
                      className="btn"
                      href={`https://amoy.polygonscan.com/tx/${state.record.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on PolygonScan <IconExt size={14} />
                    </a>
                  )}
                  <Link className="btn btn-ghost" to="/verify">
                    Check a different file <IconArrow size={14} />
                  </Link>
                </div>
              </div>
              <div
                style={{
                  color: 'var(--ink-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SealGraphic size={240} />
              </div>
            </div>
            <div
              style={{
                borderTop: '1px solid var(--rule)',
                padding: '16px 24px',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 20,
                alignItems: 'center',
              }}
            >
              <span className="label">SHA-256 Map</span>
              <HashStrip hash={state.record.hash} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
