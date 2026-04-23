import React, { useEffect, useRef, useState } from 'react';
import { computeFileHash } from '../services/hashService';
import { findRecordByHashDetailed } from '../services/chainService';
import {
  parseBundle,
  verifyFileAgainstBundle,
  type BatchProofBundle,
  type MerkleProof,
} from '../services/merkleService';
import { IconArrow, IconCheck, IconExt, IconFile, IconX } from './Icons';

type Phase =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | {
      kind: 'ok';
      file: File;
      bundle: BatchProofBundle;
      fileHash: string;
      proof: MerkleProof;
      onChain: { txHash?: string; blockHeight?: number; timestamp?: number; signer?: string };
    }
  | { kind: 'fail'; reason: string }
  | { kind: 'missing_on_chain'; bundle: BatchProofBundle }
  | { kind: 'chain_error'; message: string };

function shortHash(h?: string | null): string {
  if (!h) return '—';
  const clean = h.replace(/^0x/, '');
  if (clean.length <= 14) return h;
  return `${h.slice(0, 12)}…${clean.slice(-4)}`;
}

export const BatchVerifyPanel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [bundle, setBundle] = useState<BatchProofBundle | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);
  const bundleRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setBundle(null);
    setPhase({ kind: 'idle' });
  };

  const ingestBundleFile = async (f: File) => {
    try {
      const text = await f.text();
      const parsed = parseBundle(JSON.parse(text));
      if (!parsed.ok) {
        setPhase({ kind: 'fail', reason: parsed.error });
        setBundle(null);
        return;
      }
      setBundle(parsed.bundle);
      setPhase({ kind: 'idle' });
    } catch (e) {
      setPhase({
        kind: 'fail',
        reason: e instanceof Error ? e.message : 'Could not parse bundle JSON',
      });
      setBundle(null);
    }
  };

  const runCheck = async (f: File, b: BatchProofBundle) => {
    setPhase({ kind: 'checking' });
    try {
      const fileHash = await computeFileHash(f);
      const verdict = await verifyFileAgainstBundle(fileHash, b);
      if (verdict.status !== 'match') {
        const reason =
          verdict.status === 'no_member'
            ? `This file's SHA-256 (${shortHash(fileHash)}) is not listed in the bundle.`
            : verdict.status === 'tampered'
            ? 'The bundle entry for this file fails Merkle verification — the proof has been tampered with.'
            : "The bundle's per-proof root does not match the bundle's headline root — treat this bundle as forged.";
        setPhase({ kind: 'fail', reason });
        return;
      }
      const chain = await findRecordByHashDetailed(b.rootHash);
      if (chain.status === 'not_found') {
        setPhase({ kind: 'missing_on_chain', bundle: b });
        return;
      }
      if (chain.status === 'error') {
        setPhase({ kind: 'chain_error', message: chain.error });
        return;
      }
      setPhase({
        kind: 'ok',
        file: f,
        bundle: b,
        fileHash,
        proof: verdict.proof,
        onChain: {
          txHash: chain.record.txHash,
          blockHeight: chain.record.blockHeight,
          timestamp: chain.record.timestamp,
          signer: chain.record.sender,
        },
      });
    } catch (e) {
      setPhase({
        kind: 'fail',
        reason: e instanceof Error ? e.message : 'Verification failed',
      });
    }
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (bundle) void runCheck(f, bundle);
    else setPhase({ kind: 'idle' });
  };

  const onBundlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    void (async () => {
      await ingestBundleFile(f);
      if (file && bundle) void runCheck(file, bundle);
    })();
  };

  // Re-run automatically when both have loaded via independent paths.
  useEffect(() => {
    if (file && bundle && phase.kind === 'idle') {
      void runCheck(file, bundle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, bundle]);

  return (
    <section
      aria-labelledby="batch-verify-heading"
      style={{ marginTop: 48, border: '1px solid var(--rule)' }}
    >
      <header
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            id="batch-verify-heading"
            className="label"
            style={{ color: 'var(--seal)', marginBottom: 4 }}
          >
            § BATCH · MEMBERSHIP VERIFY
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>
            Drop a file and its <code className="mono">origynl-batch-*.json</code> bundle. We'll
            prove the file is in the batch and that the root is on-chain — entirely in your
            browser.
          </div>
        </div>
        {(file || bundle || phase.kind !== 'idle') && (
          <button className="btn btn-ghost" onClick={reset}>
            Reset
          </button>
        )}
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
        }}
      >
        <label
          htmlFor="batch-file"
          style={{
            padding: 32,
            borderRight: '1px solid var(--rule)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            background: file ? 'var(--bg-1)' : 'transparent',
          }}
        >
          <input
            id="batch-file"
            ref={fileRef}
            type="file"
            onChange={onFilePick}
            style={{ display: 'none' }}
          />
          <IconFile size={18} />
          <div style={{ marginTop: 10, fontSize: 13 }}>
            {file ? file.name : 'Choose a file to verify'}
          </div>
          <div className="label-sm" style={{ marginTop: 4 }}>
            {file ? `${(file.size / 1024).toFixed(0)} KB` : 'hashed locally'}
          </div>
        </label>

        <label
          htmlFor="batch-bundle"
          style={{
            padding: 32,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            background: bundle ? 'var(--bg-1)' : 'transparent',
          }}
        >
          <input
            id="batch-bundle"
            ref={bundleRef}
            type="file"
            accept="application/json,.json"
            onChange={onBundlePick}
            style={{ display: 'none' }}
          />
          <IconFile size={18} />
          <div style={{ marginTop: 10, fontSize: 13 }}>
            {bundle
              ? `Bundle · ${bundle.proofs.length} proofs`
              : 'Choose an origynl-batch-*.json'}
          </div>
          <div className="label-sm" style={{ marginTop: 4 }}>
            {bundle ? `root ${shortHash(bundle.rootHash)}` : 'parsed locally'}
          </div>
        </label>
      </div>

      <div aria-live="polite" role="status" style={{ borderTop: '1px solid var(--rule)' }}>
        {phase.kind === 'checking' && (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <span className="label">Hashing &amp; walking proof path…</span>
          </div>
        )}

        {phase.kind === 'fail' && (
          <div
            role="alert"
            style={{
              padding: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              color: 'var(--bad)',
            }}
          >
            <IconX size={16} stroke={2.5} />
            <span>{phase.reason}</span>
          </div>
        )}

        {phase.kind === 'missing_on_chain' && (
          <div style={{ padding: 24, color: 'var(--bad)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <IconX size={16} stroke={2.5} />
              <span className="label" style={{ color: 'var(--bad)' }}>
                ROOT NOT ON LEDGER
              </span>
            </div>
            <div style={{ color: 'var(--ink-dim)', fontSize: 13 }}>
              The file matches a bundle proof, but the bundle's root hash (
              <span className="mono">{shortHash(phase.bundle.rootHash)}</span>) has not been
              certified on Polygon Amoy. This bundle is either fabricated or pre-dates its
              inscription.
            </div>
          </div>
        )}

        {phase.kind === 'chain_error' && (
          <div role="alert" style={{ padding: 24, color: 'var(--bad)' }}>
            <span className="label" style={{ color: 'var(--bad)', marginRight: 8 }}>
              CHAIN ERROR
            </span>
            {phase.message}
          </div>
        )}

        {phase.kind === 'ok' && (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <IconCheck size={18} stroke={2.5} style={{ color: 'var(--ok)' }} />
              <span className="label" style={{ color: 'var(--ok)' }}>
                AUTHENTIC · MEMBER OF BATCH
              </span>
            </div>
            <dl className="kv" style={{ marginTop: 8 }}>
              <dt>FILE</dt>
              <dd>{phase.file.name}</dd>
              <dt>FILE SHA-256</dt>
              <dd style={{ wordBreak: 'break-all', color: 'var(--ink-dim)' }}>{phase.fileHash}</dd>
              <dt>POSITION</dt>
              <dd>
                #{phase.proof.index + 1} of {phase.bundle.proofs.length}
              </dd>
              <dt>BATCH ROOT</dt>
              <dd style={{ wordBreak: 'break-all', color: 'var(--ink-dim)' }}>
                {phase.bundle.rootHash}
              </dd>
              <dt>TX</dt>
              <dd style={{ color: 'var(--seal)' }}>
                {phase.onChain.txHash ? (
                  <a
                    href={`https://amoy.polygonscan.com/tx/${phase.onChain.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--seal)' }}
                  >
                    {shortHash(phase.onChain.txHash)}{' '}
                    <IconExt size={10} style={{ verticalAlign: 'middle' }} />
                  </a>
                ) : (
                  shortHash(phase.bundle.txHash)
                )}
              </dd>
              <dt>BLOCK</dt>
              <dd>
                {phase.onChain.blockHeight
                  ? `#${phase.onChain.blockHeight.toLocaleString()}`
                  : '—'}
              </dd>
              <dt>SIGNER</dt>
              <dd>{shortHash(phase.onChain.signer)}</dd>
              <dt>WITNESSED</dt>
              <dd>
                {phase.onChain.timestamp
                  ? new Date(phase.onChain.timestamp).toISOString().replace('T', ' ').slice(0, 19) +
                    'Z'
                  : '—'}
              </dd>
            </dl>
            <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {phase.onChain.txHash && (
                <a
                  className="btn"
                  href={`https://amoy.polygonscan.com/tx/${phase.onChain.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on PolygonScan <IconExt size={14} />
                </a>
              )}
              <a
                className="btn btn-ghost"
                href={`/#/proof/${phase.onChain.txHash || phase.bundle.rootHash}`}
              >
                Open proof page <IconArrow size={14} />
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
