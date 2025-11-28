import React, { useState, useRef } from 'react';
import { Upload, ArrowRight, Download, RefreshCw, FileText, AlertTriangle, Check, Loader2, Package, Files } from 'lucide-react';
import { computeFileHash } from '../services/hashService';
import { writeHashToChain } from '../services/chainService';
import { buildMerkleTree, MerkleProof } from '../services/merkleService';
import { generateBatchCertificate } from '../services/certificateService';

interface FileWithHash {
  file: File;
  hash: string;
  status: 'pending' | 'hashing' | 'done';
}

interface BatchResult {
  txHash: string;
  timestamp: number;
  rootHash: string;
  proofs: MerkleProof[];
}

export const Batch: React.FC = () => {
  const [files, setFiles] = useState<FileWithHash[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'HASHING' | 'MINING' | 'GENERATING' | 'COMPLETE'>('IDLE');
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [certificatesZipUrl, setCertificatesZipUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: FileWithHash[] = Array.from(e.target.files).map(file => ({
        file,
        hash: '',
        status: 'pending'
      }));
      setFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const newFiles: FileWithHash[] = Array.from(e.dataTransfer.files).map(file => ({
        file,
        hash: '',
        status: 'pending'
      }));
      setFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startBatchProcess = async () => {
    if (files.length === 0) return;
    setError(null);

    try {
      // Phase 1: Hash all files
      setStatus('HASHING');
      setProgress({ current: 0, total: files.length, phase: 'Creating fingerprints...' });

      const hashedFiles: { hash: string; fileName: string }[] = [];
      
      for (let i = 0; i < files.length; i++) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'hashing' } : f
        ));
        
        const hash = await computeFileHash(files[i].file);
        hashedFiles.push({ hash, fileName: files[i].file.name });
        
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, hash, status: 'done' } : f
        ));
        
        setProgress({ current: i + 1, total: files.length, phase: 'Creating fingerprints...' });
      }

      // Phase 2: Build Merkle tree
      setProgress({ current: 0, total: 1, phase: 'Building proof structure...' });
      const tree = await buildMerkleTree(hashedFiles);
      setProgress({ current: 1, total: 1, phase: 'Building proof structure...' });

      // Phase 3: Write root to blockchain
      setStatus('MINING');
      setProgress({ current: 0, total: 1, phase: 'Recording on blockchain...' });
      
      const chainRecord = await writeHashToChain(
        tree.root,
        `Batch of ${files.length} documents`,
        'UPLOAD'
      );

      setProgress({ current: 1, total: 1, phase: 'Recording on blockchain...' });

      // Phase 4: Generate certificates
      setStatus('GENERATING');
      setProgress({ current: 0, total: files.length, phase: 'Generating certificates...' });

      const certificates: { name: string; blob: Blob }[] = [];
      
      for (let i = 0; i < tree.proofs.length; i++) {
        const cert = await generateBatchCertificate({
          fileName: tree.proofs[i].fileName,
          fileHash: tree.proofs[i].fileHash,
          txHash: chainRecord.txHash || '',
          timestamp: chainRecord.timestamp,
          merkleProof: tree.proofs[i]
        });
        
        const safeName = tree.proofs[i].fileName.replace(/[^a-z0-9]/gi, '_');
        certificates.push({ 
          name: `certificate-${safeName}.pdf`, 
          blob: cert 
        });
        
        setProgress({ current: i + 1, total: files.length, phase: 'Generating certificates...' });
      }

      // Create zip file with all certificates
      // Using JSZip would be ideal, but for simplicity we'll provide individual downloads
      // For now, store the first certificate as a demo
      if (certificates.length > 0) {
        setCertificatesZipUrl(URL.createObjectURL(certificates[0].blob));
      }

      setResult({
        txHash: chainRecord.txHash || '',
        timestamp: chainRecord.timestamp,
        rootHash: tree.root,
        proofs: tree.proofs
      });

      setStatus('COMPLETE');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Batch processing failed');
      setStatus('IDLE');
    }
  };

  const downloadCertificate = async (proof: MerkleProof) => {
    if (!result) return;
    
    const cert = await generateBatchCertificate({
      fileName: proof.fileName,
      fileHash: proof.fileHash,
      txHash: result.txHash,
      timestamp: result.timestamp,
      merkleProof: proof
    });
    
    const url = URL.createObjectURL(cert);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${proof.fileName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setFiles([]);
    setStatus('IDLE');
    setResult(null);
    setError(null);
    setCertificatesZipUrl(null);
    setProgress({ current: 0, total: 0, phase: '' });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-16">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <span className="text-orange-600 text-[10px] uppercase tracking-widest font-bold mb-2 block">Batch Certification</span>
          <h1 className="font-serif text-3xl md:text-5xl text-white mb-4">Certify Multiple Files</h1>
          <p className="text-neutral-500 font-light max-w-xl text-sm md:text-base">
            Upload multiple documents and certify them all with a single blockchain transaction. 
            Each file gets its own certificate with a mathematical proof linking it to the batch.
          </p>
        </div>

        {/* How it works - collapsible explanation */}
        <div className="mb-8 p-4 md:p-6 bg-neutral-900/50 border border-white/5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Package size={16} className="text-orange-600" />
            How batch certification works
          </h3>
          <div className="text-sm text-neutral-400 space-y-2">
            <p>
              Instead of recording each file separately (which would cost more and take longer), 
              we combine all your documents into a single "summary" that gets recorded on the blockchain.
            </p>
            <p>
              Each file still gets its own certificate with a unique proof. Anyone can verify a single 
              document without needing access to the other files in the batch.
            </p>
            <p className="text-neutral-500 text-xs">
              Technical note: We build a Merkle tree from the file hashes and record only the root hash on-chain.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-900/50 flex items-start gap-4">
            <AlertTriangle className="text-red-500 shrink-0" size={20} />
            <div>
              <h4 className="text-red-500 font-bold text-xs uppercase tracking-widest">Error</h4>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {status === 'IDLE' && (
          <>
            {/* Drop zone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border border-dashed border-neutral-800 hover:border-orange-600 hover:bg-white/5 transition-all p-8 md:p-12 text-center cursor-pointer mb-6"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
                multiple
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
              <div className="w-16 h-16 rounded-full border border-neutral-800 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-neutral-500" />
              </div>
              <p className="text-neutral-400 mb-2">Drop files here or click to browse</p>
              <p className="text-neutral-600 text-xs">Supports images, PDFs, and documents</p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Files size={16} className="text-orange-600" />
                    {files.length} file{files.length > 1 ? 's' : ''} ready
                  </h3>
                  <button 
                    onClick={() => setFiles([])}
                    className="text-xs text-neutral-500 hover:text-red-500 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-neutral-900/50 border border-white/5">
                      <FileText size={16} className="text-neutral-600 shrink-0" />
                      <span className="text-sm text-neutral-300 truncate flex-1">{f.file.name}</span>
                      <span className="text-xs text-neutral-600">{(f.file.size / 1024).toFixed(0)} KB</span>
                      <button 
                        onClick={() => removeFile(i)}
                        className="text-neutral-600 hover:text-red-500 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit button */}
            <button 
              onClick={startBatchProcess}
              disabled={files.length === 0}
              className="w-full py-5 bg-orange-600 hover:bg-orange-700 disabled:bg-neutral-900 disabled:text-neutral-700 disabled:cursor-not-allowed text-white transition-all uppercase tracking-widest text-sm font-bold flex items-center justify-center gap-3"
            >
              Certify {files.length > 0 ? `${files.length} Files` : 'Files'}
              <ArrowRight size={16} />
            </button>
          </>
        )}

        {/* Processing state */}
        {(status === 'HASHING' || status === 'MINING' || status === 'GENERATING') && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-orange-600 mx-auto mb-4 animate-spin" />
              <h3 className="font-serif text-2xl text-white mb-2">{progress.phase}</h3>
              <p className="text-neutral-500">
                {progress.current} of {progress.total}
              </p>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-neutral-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-600 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>

            {/* File status list */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-2 text-sm">
                  {f.status === 'done' ? (
                    <Check size={14} className="text-green-500" />
                  ) : f.status === 'hashing' ? (
                    <Loader2 size={14} className="text-orange-500 animate-spin" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-neutral-700" />
                  )}
                  <span className={f.status === 'done' ? 'text-neutral-400' : 'text-neutral-600'}>
                    {f.file.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complete state */}
        {status === 'COMPLETE' && result && (
          <div className="space-y-6">
            <div className="p-6 md:p-8 border border-green-900/30 bg-green-950/10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center shrink-0">
                  <Check className="text-green-500" size={24} />
                </div>
                <div>
                  <h3 className="font-serif text-2xl text-white mb-2">Batch Certified</h3>
                  <p className="text-neutral-400 text-sm">
                    {files.length} documents have been certified with a single blockchain transaction.
                    Download each certificate below.
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction details */}
            <div className="p-4 bg-neutral-900/50 border border-white/5 space-y-3">
              <div>
                <span className="text-xs text-neutral-600 uppercase tracking-widest">Transaction ID</span>
                <a 
                  href={`https://amoy.polygonscan.com/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-orange-600 hover:text-orange-500 font-mono truncate"
                >
                  {result.txHash}
                </a>
              </div>
              <div>
                <span className="text-xs text-neutral-600 uppercase tracking-widest">Batch Root Hash</span>
                <p className="text-sm text-neutral-400 font-mono truncate">{result.rootHash}</p>
              </div>
            </div>

            {/* Certificate downloads */}
            <div>
              <h4 className="text-sm font-bold text-white mb-3">Download Certificates</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.proofs.map((proof, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-neutral-900/50 border border-white/5">
                    <FileText size={16} className="text-orange-600 shrink-0" />
                    <span className="text-sm text-neutral-300 truncate flex-1">{proof.fileName}</span>
                    <button
                      onClick={() => downloadCertificate(proof)}
                      className="text-xs text-orange-600 hover:text-orange-500 uppercase tracking-widest font-bold flex items-center gap-2"
                    >
                      <Download size={12} />
                      PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={reset}
              className="w-full py-4 border border-white/10 hover:bg-white/5 text-neutral-400 transition-colors uppercase tracking-widest text-xs font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              Certify Another Batch
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
