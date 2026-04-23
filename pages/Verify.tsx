import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { computeFileHash } from '../services/hashService';
import { findRecordByHashDetailed } from '../services/chainService';
import { ChainRecord } from '../types';
import { HashStrip } from '../components/HashStrip';
import { SealGraphic } from '../components/SealGraphic';
import { IconArrow, IconCheck, IconExt, IconFile, IconSearch, IconX } from '../components/Icons';

type State = 'IDLE' | 'SEARCHING' | 'AUTHENTIC' | 'NOT_FOUND' | 'ERROR';

function shortHash(h?: string | null, tailLen = 4): string {
  if (!h) return '—';
  const clean = h.replace(/^0x/, '');
  if (clean.length <= 14) return h;
  return `${h.slice(0, 12)}…${clean.slice(-tailLen)}`;
}

export const Verify: React.FC = () => {
  const location = useLocation();
  const [input, setInput] = useState('');
  const [state, setState] = useState<State>('IDLE');
  const [file, setFile] = useState<File | null>(null);
  const [record, setRecord] = useState<ChainRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedHash, setUsedHash] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryHash = params.get('hash');
    if (queryHash) {
      setInput(queryHash);
      void runLookup(queryHash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const reset = () => {
    setState('IDLE');
    setFile(null);
    setInput('');
    setRecord(null);
    setError(null);
    setUsedHash('');
  };

  const applyResult = (result: Awaited<ReturnType<typeof findRecordByHashDetailed>>) => {
    if (result.status === 'found') {
      setRecord(result.record);
      setState('AUTHENTIC');
    } else if (result.status === 'not_found') {
      setRecord(null);
      setState('NOT_FOUND');
    } else {
      setRecord(null);
      setError(result.error);
      setState('ERROR');
    }
  };

  const runLookup = async (hashOrTx: string) => {
    setState('SEARCHING');
    setError(null);
    setUsedHash(hashOrTx);
    try {
      applyResult(await findRecordByHashDetailed(hashOrTx));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
      setState('ERROR');
    }
  };

  const runFile = async (f: File) => {
    setFile(f);
    setState('SEARCHING');
    setError(null);
    try {
      const hash = await computeFileHash(f);
      setUsedHash(hash);
      applyResult(await findRecordByHashDetailed(hash));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
      setState('ERROR');
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void runFile(f);
  };

  const timestampLabel = record
    ? new Date(record.timestamp).toISOString().replace('T', ' ').slice(0, 19) + 'Z'
    : '—';

  return (
    <div style={{ padding: '64px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 48 }}>
        <div className="label" style={{ color: 'var(--seal)' }}>
          § VERIFY · AUTHENTICATION LOOKUP
        </div>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(56px, 7vw, 112px)',
            letterSpacing: '-0.035em',
            lineHeight: 1.02,
            marginTop: 12,
          }}
        >
          Is it the<br />original?
        </h1>
        <p style={{ marginTop: 32, color: 'var(--ink-dim)', fontSize: 17, maxWidth: 640 }}>
          Drop a file or paste a transaction hash. We'll ask the chain whether the fingerprint was ever inscribed, and return the full block record if so.
        </p>
      </div>

      {state === 'IDLE' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0,
            border: '1px solid var(--rule)',
          }}
        >
          <button
            type="button"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            aria-label="Upload a file to verify. Drag and drop or press Enter."
            style={{
              padding: 48,
              borderRight: '1px solid var(--rule)',
              cursor: 'pointer',
              textAlign: 'center',
              background: 'var(--bg-1)',
              width: '100%',
              border: 'none',
              color: 'inherit',
              font: 'inherit',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runFile(f);
              }}
            />
            <div
              style={{
                display: 'inline-flex',
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: '1px solid var(--rule)',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink-dim)',
              }}
            >
              <IconFile size={20} />
            </div>
            <div style={{ marginTop: 18, fontSize: 15 }}>Drop a file here</div>
            <div className="label-sm" style={{ marginTop: 6 }}>
              We'll fingerprint it locally
            </div>
          </button>
          <div style={{ padding: 48 }}>
            <div className="label">BY TRANSACTION OR HASH</div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) void runLookup(input.trim());
              }}
              style={{
                marginTop: 16,
                border: '1px solid var(--rule)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <IconSearch size={16} style={{ color: 'var(--ink-mute)' }} />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="0x… or SHA-256 fingerprint"
                style={{ flex: 1, fontSize: 13 }}
                aria-label="Transaction or hash"
              />
            </form>
            <button
              className="btn btn-seal"
              style={{ marginTop: 16, width: '100%', justifyContent: 'space-between' }}
              onClick={() => input.trim() && runLookup(input.trim())}
              disabled={!input.trim()}
            >
              <span>Query ledger</span>
              <IconArrow size={14} />
            </button>
          </div>
        </div>
      )}

      {state === 'SEARCHING' && (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          style={{ padding: 64, border: '1px solid var(--rule)', textAlign: 'center' }}
        >
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
            Querying Polygon ledger…
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)', marginTop: 6 }}>
            reading records[{(file?.name || input).slice(0, 24)}…]
          </div>
        </div>
      )}

      {state === 'AUTHENTIC' && record && (
        <div
          role="status"
          aria-live="polite"
          style={{ border: '2px solid var(--ok)', background: 'var(--bg-1)', position: 'relative' }}
        >
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
                AUTHENTIC · MATCH CONFIRMED
              </span>
            </div>
            <span className="label-sm">
              Record tier: {record.provenanceType === 'LIVE_CAPTURE' ? 'LIVE WITNESS' : 'STANDARD'}
            </span>
          </div>
          <div
            style={{
              padding: 40,
              display: 'grid',
              gridTemplateColumns: '1fr 300px',
              gap: 48,
            }}
          >
            <div>
              <div
                className="serif"
                style={{ fontSize: 56, letterSpacing: '-0.03em', lineHeight: 1.02 }}
              >
                Verified<br />against chain.
              </div>
              <p style={{ marginTop: 16, color: 'var(--ink-dim)' }}>
                The fingerprint of the file you provided appears in the OrigynlLedger contract and was recorded
                {record.blockHeight ? <> at block <b>#{record.blockHeight.toLocaleString()}</b></> : ''}
                . The file has not been modified since certification.
              </p>
              <dl className="kv" style={{ marginTop: 32 }}>
                <dt>FILE</dt>
                <dd>{file?.name || record.fileName || 'document via hash lookup'}</dd>
                <dt>FINGERPRINT</dt>
                <dd style={{ wordBreak: 'break-all' }}>{record.hash}</dd>
                <dt>TX</dt>
                <dd style={{ color: 'var(--seal)' }}>
                  {record.txHash ? (
                    <a
                      href={`https://amoy.polygonscan.com/tx/${record.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--seal)' }}
                    >
                      {shortHash(record.txHash)}{' '}
                      <IconExt size={10} style={{ verticalAlign: 'middle' }} />
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
                <dt>BLOCK</dt>
                <dd>{record.blockHeight ? `#${record.blockHeight.toLocaleString()}` : '—'}</dd>
                <dt>SIGNER</dt>
                <dd>{record.sender ? shortHash(record.sender) : '—'}</dd>
                <dt>WITNESSED</dt>
                <dd>{timestampLabel}</dd>
                <dt>TIER</dt>
                <dd style={{ color: 'var(--seal)' }}>
                  {record.provenanceType === 'LIVE_CAPTURE'
                    ? 'LIVE CAPTURE · sensor bound'
                    : 'STANDARD · file hash'}
                </dd>
              </dl>
              <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {record.txHash && (
                  <a
                    className="btn"
                    href={`https://amoy.polygonscan.com/tx/${record.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on PolygonScan <IconExt size={14} />
                  </a>
                )}
                <button className="btn btn-ghost" onClick={reset}>
                  Verify another
                </button>
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
              <SealGraphic size={260} />
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
            <HashStrip hash={record.hash} />
          </div>
        </div>
      )}

      {state === 'NOT_FOUND' && (
        <div role="status" aria-live="polite" style={{ border: '2px solid var(--bad)', padding: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <IconX size={22} stroke={2.5} style={{ color: 'var(--bad)' }} />
            <span className="label" style={{ color: 'var(--bad)' }}>
              NO RECORD · FINGERPRINT NOT ON LEDGER
            </span>
          </div>
          <h2
            className="serif"
            style={{ fontSize: 48, letterSpacing: '-0.025em', lineHeight: 1.02 }}
          >
            This file has no witness.
          </h2>
          <p style={{ marginTop: 20, color: 'var(--ink-dim)', maxWidth: 560 }}>
            Either the file was never certified through Origynl, <em>or</em> it has been modified since certification — even a single byte difference produces an entirely different fingerprint.
          </p>
          <dl className="kv" style={{ marginTop: 24 }}>
            <dt>LOOKED UP</dt>
            <dd style={{ wordBreak: 'break-all', color: 'var(--bad)' }}>
              {usedHash || input || file?.name || '—'}
            </dd>
            <dt>RESULT</dt>
            <dd style={{ color: 'var(--bad)' }}>records[hash].exists === false</dd>
          </dl>
          <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-seal" onClick={reset}>
              Try another file
            </button>
            <a className="btn" href="/#/certify">
              Certify this file instead <IconArrow size={14} />
            </a>
          </div>
        </div>
      )}

      {state === 'ERROR' && (
        <div role="alert" aria-live="assertive" style={{ border: '2px solid var(--bad)', padding: 48 }}>
          <div className="label" style={{ color: 'var(--bad)', marginBottom: 16 }}>
            ERROR · CHAIN LOOKUP FAILED
          </div>
          <p style={{ color: 'var(--ink-dim)', maxWidth: 560 }}>{error}</p>
          <div style={{ marginTop: 24 }}>
            <button className="btn btn-seal" onClick={reset}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
