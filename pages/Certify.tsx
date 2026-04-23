import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { computeFileHash, computeCompositeHash } from '../services/hashService';
import { writeHashToChain } from '../services/chainService';
import { generateCertificate } from '../services/certificateService';
import { buildMerkleTree, type MerkleProof } from '../services/merkleService';
import { stampHashViaOts, decodeBase64ToBytes, type OtsStamp } from '../services/otsService';
import { SensorData, ChainRecord } from '../types';
import { HashStrip } from '../components/HashStrip';
import { SealGraphic } from '../components/SealGraphic';
import {
  IconArrow,
  IconCheck,
  IconCopy,
  IconDownload,
  IconExt,
  IconFile,
  IconUpload,
  IconX,
} from '../components/Icons';

type Stage = 'IDLE' | 'PROCESSING' | 'DONE';

const STEPS: { id: string; label: string; hint: string }[] = [
  { id: 'READ', label: 'Reading file', hint: 'streaming bytes' },
  { id: 'HASH', label: 'Computing SHA-256 fingerprint', hint: 'crypto.subtle.digest · 64 bytes' },
  { id: 'NET', label: 'Connecting to Polygon', hint: 'rpc-amoy.polygon.technology' },
  { id: 'SIGN', label: 'Signing transaction', hint: 'relayer broadcast' },
  { id: 'MINE', label: 'Awaiting block confirmation', hint: 'watching next block' },
  { id: 'CERT', label: 'Issuing certificate', hint: 'generating PDF' },
];

function shortHash(h?: string | null): string {
  if (!h) return '—';
  const clean = h.replace(/^0x/, '');
  if (clean.length <= 14) return h;
  return `${h.slice(0, 12)}…${clean.slice(-4)}`;
}

function polygonScanUrl(txHash?: string): string {
  if (!txHash) return '#';
  return `https://amoy.polygonscan.com/tx/${txHash}`;
}

export const Certify: React.FC = () => {
  const location = useLocation() as {
    state?: { file?: File; isLiveCapture?: boolean; sensorData?: SensorData };
  };

  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>('IDLE');
  const [step, setStep] = useState(0);
  const [hash, setHash] = useState<string>('');
  const [record, setRecord] = useState<ChainRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [witnessNote, setWitnessNote] = useState('');
  const [batchProofs, setBatchProofs] = useState<MerkleProof[] | null>(null);
  const [otsStamp, setOtsStamp] = useState<OtsStamp | null>(null);
  const [otsError, setOtsError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const incomingState = location.state;

  useEffect(() => {
    if (incomingState?.file) {
      setFiles([incomingState.file]);
    }
  }, [incomingState]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) setFiles(dropped);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) setFiles(picked);
  };

  const reset = () => {
    setFiles([]);
    setStage('IDLE');
    setStep(0);
    setHash('');
    setRecord(null);
    setError(null);
    setWitnessNote('');
    setBatchProofs(null);
    setOtsStamp(null);
    setOtsError(null);
  };

  const runOtsInBackground = (hashToStamp: string) => {
    setOtsStamp(null);
    setOtsError(null);
    stampHashViaOts(hashToStamp)
      .then((s) => setOtsStamp(s))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'OTS stamping failed';
        console.warn('[Certify] OTS stamping failed (non-fatal):', msg);
        setOtsError(msg);
      });
  };

  const isBatch = files.length > 1;

  const begin = async () => {
    if (!files.length) return;
    setStage('PROCESSING');
    setError(null);
    setStep(1);
    setBatchProofs(null);

    try {
      if (files.length === 1) {
        const file = files[0];
        let computed: string;
        if (incomingState?.isLiveCapture && incomingState.sensorData) {
          computed = await computeCompositeHash(file, incomingState.sensorData);
        } else {
          computed = await computeFileHash(file);
        }
        setHash(computed);
        setStep(2);
        setStep(3);

        runOtsInBackground(computed);

        const written = await writeHashToChain(
          computed,
          file.name,
          incomingState?.isLiveCapture ? 'LIVE_CAPTURE' : 'UPLOAD',
        );
        setStep(5);
        setRecord(written);
        setStep(6);
        setStage('DONE');
        return;
      }

      // Batch path: hash every file, build a Merkle tree, commit the root.
      const hashed: { hash: string; fileName: string }[] = [];
      for (const f of files) {
        hashed.push({ hash: await computeFileHash(f), fileName: f.name });
      }
      setStep(2);

      const tree = await buildMerkleTree(hashed);
      setHash(tree.root);
      setBatchProofs(tree.proofs);
      setStep(3);

      runOtsInBackground(tree.root);

      const written = await writeHashToChain(
        tree.root,
        `Batch of ${files.length} files`,
        'UPLOAD',
      );
      setStep(5);
      setRecord(written);
      setStep(6);
      setStage('DONE');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Inscription failed';
      setError(msg);
      setStage('IDLE');
    }
  };

  const downloadCertificate = async () => {
    if (!record) return;
    try {
      const blob = await generateCertificate({
        fileName: record.fileName,
        fileHash: record.hash,
        txHash: record.txHash ?? '',
        timestamp: record.timestamp,
        blockHeight: record.blockHeight,
        sender: record.sender,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `origynl-certificate-${record.hash.slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadOts = () => {
    if (!otsStamp) return;
    const bytes = decodeBase64ToBytes(otsStamp.otsBase64);
    const blob = new Blob([bytes], { type: 'application/vnd.ots' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `origynl-${otsStamp.hash.slice(0, 10)}.ots`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBatchProofs = () => {
    if (!record || !batchProofs) return;
    const bundle = {
      schema: 'origynl.batch-proofs.v1',
      rootHash: record.hash,
      txHash: record.txHash ?? null,
      blockHeight: record.blockHeight,
      timestamp: record.timestamp,
      signer: record.sender,
      chain: { name: 'Polygon Amoy', id: 80002 },
      note: witnessNote || undefined,
      proofs: batchProofs.map((p) => ({
        fileName: p.fileName,
        fileHash: p.fileHash,
        leafHash: p.leafHash,
        proofPath: p.proofPath,
        index: p.index,
        totalFiles: p.totalFiles,
      })),
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `origynl-batch-${record.hash.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLink = () => {
    const id = record?.txHash || record?.hash;
    if (!id) return;
    const link = `${window.location.origin}/#/proof/${id}`;
    navigator.clipboard.writeText(link).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => setCopied(false),
    );
  };

  const issuedLabel = record?.timestamp
    ? new Date(record.timestamp).toISOString().replace('T', ' ').slice(0, 19) + 'Z'
    : '—';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 520px',
        minHeight: 'calc(100vh - 72px - 28px)',
      }}
    >
      {/* LEFT — form */}
      <div
        style={{
          padding: '56px 48px',
          borderRight: '1px solid var(--rule)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ marginBottom: 40 }}>
          <div className="label" style={{ color: 'var(--seal)' }}>§ CERTIFY · ORIGINAL INTAKE</div>
          <h1
            className="serif"
            style={{
              fontSize: 72,
              letterSpacing: '-0.035em',
              lineHeight: 1.02,
              marginTop: 12,
            }}
          >
            Inscribe<br />an original.
          </h1>
          <p style={{ marginTop: 28, color: 'var(--ink-dim)', fontSize: 16, maxWidth: 520 }}>
            Drop a file. Nothing uploads — only its SHA-256 fingerprint is written to the public ledger. You receive a PDF certificate and a permanent block reference.
          </p>
        </div>

        {stage === 'IDLE' && (
          <>
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Upload a file to certify. Drag and drop, or press Enter to browse."
              style={{
                border: '1px dashed var(--rule-hi)',
                padding: 48,
                textAlign: 'center',
                cursor: 'pointer',
                background: files.length ? 'var(--bg-1)' : 'transparent',
                transition: 'all .2s ease',
              }}
            >
              <input ref={inputRef} type="file" hidden onChange={onPick} />
              {files.length === 0 ? (
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      border: '1px solid var(--rule)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ink-dim)',
                    }}
                  >
                    <IconUpload size={22} />
                  </div>
                  <div style={{ marginTop: 20, fontSize: 16, color: 'var(--ink)' }}>
                    Drop a file, or browse
                  </div>
                  <div className="label-sm" style={{ marginTop: 8 }}>
                    PDF · DOCX · JPG · PNG · ZIP · up to 100 MB
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'left' }}>
                  <div
                    className="label"
                    style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}
                  >
                    <span>{files.length} file{files.length > 1 ? 's' : ''} selected</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFiles([]);
                      }}
                      style={{
                        color: 'var(--seal)',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        font: 'inherit',
                        letterSpacing: 'inherit',
                      }}
                    >
                      CLEAR
                    </button>
                  </div>
                  {files.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto auto',
                        gap: 12,
                        alignItems: 'center',
                        padding: '12px 0',
                        borderTop: '1px solid var(--rule)',
                      }}
                    >
                      <IconFile size={14} />
                      <span style={{ fontSize: 13 }}>{f.name}</span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-mute)' }}>
                        {(f.size / 1024).toFixed(0)} KB
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFiles(files.filter((_, j) => j !== i));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--ink-mute)',
                          cursor: 'pointer',
                        }}
                        aria-label="Remove file"
                      >
                        <IconX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isBatch && (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  border: '1px solid var(--rule)',
                  background: 'var(--bg-1)',
                  fontSize: 12,
                }}
              >
                <span className="label" style={{ color: 'var(--seal)', marginRight: 8 }}>
                  BATCH
                </span>
                {files.length} files will be Merkle-rooted and committed in a{' '}
                <strong>single transaction</strong>. You&apos;ll receive a proof bundle that lets
                anyone independently verify each file against the on-chain root.
              </div>
            )}

            {files.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className="label" style={{ marginBottom: 8 }}>Witness statement (optional)</div>
                <textarea
                  value={witnessNote}
                  onChange={(e) => setWitnessNote(e.target.value.slice(0, 280))}
                  placeholder="Up to 280 chars. Stored as metadata, never on-chain."
                  rows={2}
                  style={{
                    width: '100%',
                    background: 'var(--bg-1)',
                    border: '1px solid var(--rule)',
                    color: 'var(--ink)',
                    padding: 12,
                    fontFamily: 'var(--mono)',
                    fontSize: 12,
                    resize: 'vertical',
                  }}
                />
                <div
                  className="label-sm"
                  style={{ textAlign: 'right', marginTop: 4 }}
                >
                  {witnessNote.length} / 280
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                style={{
                  marginTop: 20,
                  padding: 14,
                  background: 'color-mix(in oklch, var(--bad) 12%, var(--bg-1))',
                  border: '1px solid var(--bad)',
                  fontSize: 12,
                  color: 'var(--bad)',
                }}
              >
                <span className="label" style={{ color: 'var(--bad)', marginRight: 8 }}>ERROR</span>
                {error}
              </div>
            )}

            <div
              style={{
                marginTop: 32,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
              }}
            >
              <div style={{ padding: 16, border: '1px solid var(--rule)' }}>
                <div className="label-sm">Privacy</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>File never leaves this device.</div>
              </div>
              <div style={{ padding: 16, border: '1px solid var(--rule)' }}>
                <div className="label-sm">Cost</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>~0.002 POL · we pay gas.</div>
              </div>
            </div>

            <button
              onClick={begin}
              disabled={!files.length}
              className="btn btn-seal"
              style={{
                marginTop: 32,
                padding: '18px 24px',
                justifyContent: 'space-between',
              }}
            >
              <span>
                Inscribe {files.length > 1 ? `${files.length} files` : 'document'} to ledger
              </span>
              <IconArrow size={14} />
            </button>
          </>
        )}

        {stage === 'PROCESSING' && (
          <div role="status" aria-live="polite" aria-busy="true">
            <div className="label" style={{ color: 'var(--seal)', marginBottom: 16 }}>
              PROCESSING · DO NOT CLOSE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step - 1 || (i === step && step === STEPS.length);
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: 16,
                      alignItems: 'center',
                      padding: '18px 0',
                      borderBottom: '1px solid var(--rule)',
                      opacity: i >= step && !active ? 0.4 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: '1px solid var(--rule)',
                        display: 'grid',
                        placeItems: 'center',
                        background: done ? 'var(--ok)' : 'transparent',
                      }}
                    >
                      {done ? (
                        <IconCheck size={12} stroke={2.5} />
                      ) : active ? (
                        <span
                          className="pulsedot"
                          style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--seal)' }}
                        />
                      ) : (
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          color: active ? 'var(--ink)' : 'var(--ink-dim)',
                        }}
                      >
                        {s.label}
                      </div>
                      {active && (
                        <div
                          className="mono"
                          style={{ fontSize: 10, color: 'var(--ink-mute)', marginTop: 4 }}
                        >
                          {s.hint}
                        </div>
                      )}
                    </div>
                    <span className="label-sm">{done ? 'OK' : active ? '…' : ''}</span>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 32,
                height: 2,
                background: 'var(--rule)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${(step / STEPS.length) * 100}%`,
                  background: 'var(--seal)',
                  transition: 'width .4s ease',
                }}
              />
            </div>
          </div>
        )}

        {stage === 'DONE' && record && (
          <div role="status" aria-live="polite">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                paddingBottom: 20,
                borderBottom: '1px solid var(--rule)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--ok)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#002d10',
                }}
              >
                <IconCheck size={22} stroke={2.5} />
              </div>
              <div>
                <div className="label" style={{ color: 'var(--ok)' }}>
                  {batchProofs ? `BATCH CERTIFIED · ${batchProofs.length} FILES` : 'CERTIFIED'}
                </div>
                <div
                  className="serif"
                  style={{ fontSize: 32, letterSpacing: '-0.02em', marginTop: 4 }}
                >
                  {batchProofs
                    ? `${batchProofs.length} files · one transaction.`
                    : 'Inscribed. Permanent.'}
                </div>
              </div>
            </div>

            <dl className="kv" style={{ marginTop: 24 }}>
              <dt>{batchProofs ? 'ROOT' : 'FILE'}</dt>
              <dd>
                {batchProofs
                  ? `Merkle root covering ${batchProofs.length} documents`
                  : record.fileName}
              </dd>
              <dt>{batchProofs ? 'ROOT HASH' : 'SHA-256'}</dt>
              <dd style={{ color: 'var(--ink-dim)' }}>{record.hash}</dd>
              <dt>TX</dt>
              <dd style={{ color: 'var(--seal)' }}>
                {shortHash(record.txHash)}{' '}
                {record.txHash && (
                  <IconExt size={10} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
                )}
              </dd>
              <dt>BLOCK</dt><dd>#{record.blockHeight?.toLocaleString() ?? '—'}</dd>
              <dt>ISSUED</dt><dd>{issuedLabel}</dd>
              <dt>SIGNER</dt><dd>{record.sender ? shortHash(record.sender) : '—'}</dd>
              <dt>BITCOIN ANCHOR</dt>
              <dd style={{ color: otsStamp ? 'var(--seal)' : 'var(--ink-mute)' }}>
                {otsStamp
                  ? `pending upgrade · OTS stamped (${otsStamp.otsBase64.length} B₆₄)`
                  : otsError
                  ? `unavailable — ${otsError.slice(0, 80)}`
                  : 'stamping…'}
              </dd>
            </dl>

            {batchProofs && (
              <details
                style={{
                  marginTop: 20,
                  padding: '12px 16px',
                  border: '1px solid var(--rule)',
                  background: 'var(--bg-1)',
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontSize: 12,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-dim)',
                  }}
                >
                  Files in this batch
                </summary>
                <ol style={{ marginTop: 12, paddingLeft: 20, fontSize: 12 }}>
                  {batchProofs.map((p) => (
                    <li
                      key={p.index}
                      style={{ padding: '4px 0', color: 'var(--ink-dim)' }}
                    >
                      <span style={{ color: 'var(--ink)' }}>{p.fileName}</span>
                      <span
                        className="mono"
                        style={{ marginLeft: 8, color: 'var(--ink-mute)' }}
                      >
                        {shortHash(p.fileHash)}
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            <div
              style={{
                marginTop: 32,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <button
                className="btn btn-seal"
                style={{ justifyContent: 'space-between' }}
                onClick={downloadCertificate}
              >
                <span>Download certificate</span>
                <IconDownload size={14} />
              </button>
              {batchProofs && (
                <button
                  className="btn"
                  style={{ justifyContent: 'space-between' }}
                  onClick={downloadBatchProofs}
                >
                  <span>Download proof bundle ({batchProofs.length})</span>
                  <IconDownload size={14} />
                </button>
              )}
              {otsStamp && (
                <button
                  className="btn"
                  style={{ justifyContent: 'space-between' }}
                  onClick={downloadOts}
                  title="OpenTimestamps proof — Bitcoin-anchored second witness"
                >
                  <span>Download .ots (Bitcoin anchor)</span>
                  <IconDownload size={14} />
                </button>
              )}
              <a
                className="btn"
                style={{ justifyContent: 'space-between' }}
                href={polygonScanUrl(record.txHash)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>View on PolygonScan</span>
                <IconExt size={14} />
              </a>
              <button
                className="btn"
                style={{ justifyContent: 'space-between' }}
                onClick={copyLink}
              >
                <span>{copied ? 'Copied' : 'Copy verification link'}</span>
                <IconCopy size={14} />
              </button>
              <button
                className="btn btn-ghost"
                style={{ justifyContent: 'space-between' }}
                onClick={reset}
              >
                <span>Certify another</span>
                <IconArrow size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT — preview / seal */}
      <aside
        style={{
          background: 'var(--bg-1)',
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Live Preview</span>
          <span
            style={{
              color:
                stage === 'DONE'
                  ? 'var(--ok)'
                  : stage === 'PROCESSING'
                  ? 'var(--seal)'
                  : 'var(--ink-mute)',
            }}
          >
            {stage === 'DONE' ? 'SIGNED' : stage === 'PROCESSING' ? 'PROCESSING' : 'AWAITING'}
          </span>
        </div>
        <div
          style={{
            flex: 1,
            border: '1px solid var(--rule)',
            background: 'var(--bg)',
            padding: 32,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            minHeight: 520,
          }}
        >
          {stage === 'IDLE' && (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--ink-faint)' }}>
              <div style={{ color: 'var(--ink-dim)' }}>
                <SealGraphic size={220} />
              </div>
              <div className="label-sm" style={{ marginTop: 20 }}>
                A certificate will appear here
              </div>
            </div>
          )}
          {stage === 'PROCESSING' && (
            <div style={{ margin: 'auto', textAlign: 'center' }}>
              <div style={{ position: 'relative', width: 220, height: 220, margin: '0 auto' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    border: '1px dashed var(--rule)',
                    borderRadius: '50%',
                    animation: 'sealspin 20s linear infinite',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 20,
                    border: '1px solid var(--seal)',
                    borderRadius: '50%',
                    borderRightColor: 'transparent',
                    animation: 'sealspin 2s linear infinite',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <span
                    className="mono"
                    style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--seal)' }}
                  >
                    INSCRIBING
                  </span>
                </div>
              </div>
              <div
                className="mono"
                style={{
                  marginTop: 28,
                  fontSize: 10,
                  color: 'var(--ink-mute)',
                  letterSpacing: '0.15em',
                }}
              >
                STEP {Math.max(1, step)} / {STEPS.length}
              </div>
              {hash && (
                <div style={{ marginTop: 20, maxWidth: 280, margin: '20px auto 0' }}>
                  <HashStrip hash={hash} cells={32} />
                </div>
              )}
            </div>
          )}
          {stage === 'DONE' && record && (
            <MiniCertificate
              file={record.fileName}
              hash={record.hash}
              tx={record.txHash ?? ''}
              block={record.blockHeight ?? 0}
              issuedAt={issuedLabel}
            />
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0,
            border: '1px solid var(--rule)',
          }}
        >
          <div style={{ padding: 14, borderRight: '1px solid var(--rule)' }}>
            <div className="label-sm">Ledger Ref</div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                marginTop: 4,
                color: record?.txHash ? 'var(--seal)' : 'var(--ink-faint)',
              }}
            >
              {record?.txHash ? record.txHash.slice(0, 14) + '…' : '—'}
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="label-sm">Block</div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                marginTop: 4,
                color: record?.blockHeight ? 'var(--ink)' : 'var(--ink-faint)',
              }}
            >
              {record?.blockHeight ? `#${record.blockHeight.toLocaleString()}` : '—'}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

type MiniCertProps = {
  file?: string;
  hash: string;
  tx: string;
  block: number;
  issuedAt: string;
};

const MiniCertificate: React.FC<MiniCertProps> = ({ file, hash, tx, block, issuedAt }) => (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="label-sm">Certificate of Origin</div>
        <div className="serif" style={{ fontSize: 28, letterSpacing: '-0.02em', marginTop: 4 }}>
          Origynl.
        </div>
      </div>
      <div style={{ color: 'var(--ink-dim)' }}>
        <SealGraphic size={68} />
      </div>
    </div>
    <div style={{ marginTop: 20, fontSize: 11, color: 'var(--ink-dim)', lineHeight: 1.6 }}>
      Be it known that the file identified below was inscribed upon the Polygon public ledger and bears its timestamp as witness thereto.
    </div>
    <dl className="kv" style={{ marginTop: 20 }}>
      <dt>FILE</dt><dd>{file || '—'}</dd>
      <dt>SHA-256</dt><dd style={{ wordBreak: 'break-all', fontSize: 10 }}>{hash}</dd>
      <dt>TX</dt>
      <dd style={{ color: 'var(--seal)', fontSize: 10, wordBreak: 'break-all' }}>{tx}</dd>
      <dt>BLOCK</dt><dd>#{block.toLocaleString()}</dd>
      <dt>ISSUED</dt><dd>{issuedAt}</dd>
    </dl>
    <div style={{ flex: 1 }} />
    <div
      style={{
        borderTop: '1px solid var(--rule)',
        paddingTop: 14,
        display: 'flex',
        justifyContent: 'space-between',
        color: 'var(--ink-mute)',
      }}
    >
      <div className="mono" style={{ fontSize: 9, letterSpacing: '0.15em' }}>
        <div>VERIFY AT</div>
        <div style={{ color: 'var(--seal)' }}>origynl.app/v/{tx.slice(2, 10)}</div>
      </div>
      <div
        className="mono"
        style={{ fontSize: 9, letterSpacing: '0.15em', textAlign: 'right' }}
      >
        <div>SEAL №</div>
        <div style={{ color: 'var(--ink)' }}>{(block % 100000).toString().padStart(5, '0')}</div>
      </div>
    </div>
  </div>
);
