
import React, { useState, useRef, useEffect } from 'react';
import { Upload, ArrowRight, Download, RefreshCw, FileText, ExternalLink, Radio, AlertTriangle, Award, X, Files, Loader2, Check, Mail, Copy, CheckCheck } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { computeFileHash, computeCompositeHash } from '../services/hashService';
import { writeHashToChain } from '../services/chainService';
import { embedWatermark, embedMetadata } from '../services/imageService';
import { generateCertificate, generateBatchCertificate } from '../services/certificateService';
import { buildMerkleTree, MerkleProof } from '../services/merkleService';
import { SensorData } from '../types';

interface FileItem {
  file: File;
  hash: string;
  status: 'pending' | 'reading' | 'hashing' | 'done';
}

interface BatchResult {
  txHash: string;
  timestamp: number;
  rootHash: string;
  proofs: MerkleProof[];
}

type ProcessStep = 
  | 'IDLE'
  | 'READING_FILE'
  | 'COMPUTING_FINGERPRINT'
  | 'CONNECTING_BLOCKCHAIN'
  | 'WAITING_CONFIRMATION'
  | 'GENERATING_CERTIFICATE'
  | 'APPLYING_WATERMARK'
  | 'COMPLETE';

export const Certify: React.FC = () => {
  const location = useLocation();
  
  const [files, setFiles] = useState<FileItem[]>([]);
  const [status, setStatus] = useState<ProcessStep>('IDLE');
  const [hash, setHash] = useState<string>('');
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [txId, setTxId] = useState<string>('');
  const [timestamp, setTimestamp] = useState<number>(0);
  const [isSimulation, setIsSimulation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Batch state
  const [isBatch, setIsBatch] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  
  // Live Capture State
  const [isLive, setIsLive] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (location.state && location.state.file) {
      setFiles([{ file: location.state.file, hash: '', status: 'pending' }]);
      setIsLive(location.state.isLiveCapture || false);
      setSensorData(location.state.sensorData || null);
    }
  }, [location]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: FileItem[] = Array.from(e.target.files).map(f => ({
        file: f,
        hash: '',
        status: 'pending'
      }));
      setFiles(prev => [...prev, ...newFiles]);
      resetState();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles: FileItem[] = Array.from(e.dataTransfer.files).map(f => ({
        file: f,
        hash: '',
        status: 'pending'
      }));
      setFiles(prev => [...prev, ...newFiles]);
      resetState();
    }
  };

  const resetState = () => {
    setStatus('IDLE');
    setProcessedImage(null);
    setCertificateUrl(null);
    setHash('');
    setTxId('');
    setTimestamp(0);
    setIsSimulation(false);
    setError(null);
    setBatchResult(null);
    setEmailSent(false);
    setShowEmailInput(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startProcess = async () => {
    if (files.length === 0) return;
    setError(null);

    const isBatchMode = files.length > 1;
    setIsBatch(isBatchMode);

    try {
      if (isBatchMode) {
        await processBatch();
      } else {
        await processSingle();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Processing failed. Please try again.');
      setStatus('IDLE');
    }
  };

  const processSingle = async () => {
    const file = files[0].file;

    // Step 1: Reading file
    setStatus('READING_FILE');
    setFiles(prev => prev.map((f, i) => i === 0 ? { ...f, status: 'reading' } : f));
    await new Promise(r => setTimeout(r, 300));

    // Step 2: Computing fingerprint
    setStatus('COMPUTING_FINGERPRINT');
    setFiles(prev => prev.map((f, i) => i === 0 ? { ...f, status: 'hashing' } : f));
    
    let finalHash: string;
    if (isLive && sensorData) {
      finalHash = await computeCompositeHash(file, sensorData);
    } else {
      finalHash = await computeFileHash(file);
    }
    
    setHash(finalHash);
    setFiles(prev => prev.map((f, i) => i === 0 ? { ...f, hash: finalHash, status: 'done' } : f));

    // Step 3: Connecting to blockchain
    setStatus('CONNECTING_BLOCKCHAIN');
    await new Promise(r => setTimeout(r, 200));

    // Step 4: Waiting for confirmation
    setStatus('WAITING_CONFIRMATION');
    const geoTag = sensorData?.gps ? `${sensorData.gps.lat.toFixed(4)},${sensorData.gps.lng.toFixed(4)}` : undefined;
    
    const chainRecord = await writeHashToChain(
      finalHash, 
      file.name, 
      isLive ? 'LIVE_CAPTURE' : 'UPLOAD',
      geoTag
    );

    setTxId(chainRecord.txHash || '—');
    setTimestamp(chainRecord.timestamp || Date.now());
    setIsSimulation(!!chainRecord.isSimulation);

    // Step 5: Generate PDF certificate
    setStatus('GENERATING_CERTIFICATE');
    if (!chainRecord.isSimulation && chainRecord.txHash) {
      const certBlob = await generateCertificate({
        fileName: file.name,
        fileHash: finalHash,
        txHash: chainRecord.txHash,
        timestamp: chainRecord.timestamp || Date.now(),
        blockHeight: chainRecord.blockHeight,
        sender: chainRecord.sender,
      });
      setCertificateUrl(URL.createObjectURL(certBlob));
    }

    // Step 6: Applying watermark
    setStatus('APPLYING_WATERMARK');
    
    let finalUrl: string;
    if (file.type.startsWith('image/')) {
      const stampText = isLive ? `LIVE PROOF: ${finalHash}` : finalHash;
      const watermarkedUrl = await embedWatermark(file, stampText);
      finalUrl = await embedMetadata(file, watermarkedUrl, finalHash);
    } else if (file.type === 'application/pdf') {
      finalUrl = await embedMetadata(file, null, finalHash);
    } else {
      finalUrl = URL.createObjectURL(file);
    }

    setProcessedImage(finalUrl);
    setStatus('COMPLETE');
  };

  const processBatch = async () => {
    setBatchProgress({ current: 0, total: files.length });

    // Step 1: Hash all files
    setStatus('COMPUTING_FINGERPRINT');
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
      
      setBatchProgress({ current: i + 1, total: files.length });
    }

    // Step 2: Build Merkle tree
    setStatus('CONNECTING_BLOCKCHAIN');
    const tree = await buildMerkleTree(hashedFiles);
    setHash(tree.root);

    // Step 3: Write root to blockchain
    setStatus('WAITING_CONFIRMATION');
    const chainRecord = await writeHashToChain(
      tree.root,
      `Batch of ${files.length} documents`,
      'UPLOAD'
    );

    setTxId(chainRecord.txHash || '—');
    setTimestamp(chainRecord.timestamp || Date.now());
    setIsSimulation(!!chainRecord.isSimulation);

    // Step 4: Store result
    setBatchResult({
      txHash: chainRecord.txHash || '',
      timestamp: chainRecord.timestamp || Date.now(),
      rootHash: tree.root,
      proofs: tree.proofs
    });

    setStatus('COMPLETE');
  };

  const downloadBatchCertificate = async (proof: MerkleProof) => {
    if (!batchResult) return;
    
    const cert = await generateBatchCertificate({
      fileName: proof.fileName,
      fileHash: proof.fileHash,
      txHash: batchResult.txHash,
      timestamp: batchResult.timestamp,
      merkleProof: proof
    });
    
    const url = URL.createObjectURL(cert);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${proof.fileName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLink = () => {
    const link = `https://origynl-20.vercel.app/#/verify?hash=${hash}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStepMessage = (): string => {
    switch (status) {
      case 'READING_FILE': return 'Reading file...';
      case 'COMPUTING_FINGERPRINT': return isBatch ? `Creating fingerprints (${batchProgress.current}/${batchProgress.total})...` : 'Computing unique fingerprint...';
      case 'CONNECTING_BLOCKCHAIN': return 'Connecting to Polygon network...';
      case 'WAITING_CONFIRMATION': return 'Waiting for blockchain confirmation...';
      case 'GENERATING_CERTIFICATE': return 'Generating certificate...';
      case 'APPLYING_WATERMARK': return 'Applying digital watermark...';
      default: return '';
    }
  };

  const isPDF = files.length === 1 && files[0]?.file.type === 'application/pdf';
  const isProcessing = status !== 'IDLE' && status !== 'COMPLETE';

  return (
    <div className="grid lg:grid-cols-2 min-h-screen">
      
      {/* Left Panel */}
      <div className="p-6 md:p-16 border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col justify-center">
        
        <div className="mb-8 md:mb-12">
           <span className="text-orange-600 text-[10px] uppercase tracking-widest font-bold mb-2 block">Document Certification</span>
           <h1 className="font-serif text-3xl md:text-5xl text-white mb-4">Certify & Seal</h1>
           <p className="text-neutral-500 font-light max-w-sm text-sm md:text-base">
             {isLive 
               ? "Live capture detected. Sensor telemetry will be cryptographically bound to establish authenticity at the moment of capture." 
               : "Upload one file or many. We'll create an immutable blockchain record proving they existed at this exact moment."
             }
           </p>
        </div>

        {error && (
          <div className="mb-6 md:mb-8 p-4 bg-red-900/20 border border-red-900/50 flex items-start gap-4">
            <AlertTriangle className="text-red-500 shrink-0" size={20} />
            <div className="space-y-1 min-w-0">
              <h4 className="text-red-500 font-bold text-xs uppercase tracking-widest">Process Error</h4>
              <p className="text-red-400 text-xs font-mono break-all">{error}</p>
            </div>
          </div>
        )}

        {status === 'IDLE' && (
          <div className="space-y-6 md:space-y-8">
            {/* Drop zone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`group border border-dashed hover:border-orange-600 hover:bg-white/5 transition-all duration-500 p-8 flex flex-col items-center justify-center cursor-pointer relative ${isLive ? 'border-orange-600/50 bg-orange-900/5' : 'border-neutral-800'} ${files.length > 0 ? 'aspect-auto' : 'aspect-[4/3] md:aspect-[3/2]'}`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                multiple
              />
              
              {files.length === 0 ? (
                <div className="text-center space-y-4">
                  {isLive && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-600/20 border border-orange-600/50 rounded-full mb-4">
                      <Radio size={12} className="text-orange-500 animate-pulse" />
                      <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Live Capture Data</span>
                    </div>
                  )}
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-neutral-800 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500">
                    <Upload className="w-5 h-5 md:w-6 md:h-6 text-neutral-500 group-hover:text-orange-600 transition-colors" />
                  </div>
                  <div>
                    <p className="text-neutral-400 text-sm">Drop files here or click to browse</p>
                    <p className="text-neutral-600 text-xs mt-1">One file or many — we'll handle it</p>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Files size={16} className="text-orange-600" />
                      {files.length} file{files.length > 1 ? 's' : ''} ready
                    </span>
                    <span className="text-xs text-neutral-500 hover:text-orange-600 cursor-pointer" onClick={(e) => { e.stopPropagation(); setFiles([]); }}>
                      Clear all
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-neutral-900/50 border border-white/5" onClick={(e) => e.stopPropagation()}>
                        <FileText size={16} className="text-neutral-600 shrink-0" />
                        <span className="text-sm text-neutral-300 truncate flex-1">{f.file.name}</span>
                        <span className="text-xs text-neutral-600">{(f.file.size / 1024).toFixed(0)} KB</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          className="text-neutral-600 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-600 text-center pt-2">Click to add more files</p>
                </div>
              )}
            </div>

            {files.length > 1 && (
              <div className="p-3 bg-neutral-900/50 border border-white/5 text-xs text-neutral-400">
                <span className="text-orange-600 font-bold">Batch mode:</span> All {files.length} files will be certified with a single blockchain transaction. Each gets its own certificate.
              </div>
            )}

            <button 
               onClick={startProcess}
               disabled={files.length === 0}
               className="w-full py-5 md:py-6 bg-white hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-700 disabled:cursor-not-allowed text-black transition-all duration-300 uppercase tracking-widest text-xs font-bold flex justify-between px-6 md:px-8"
             >
               <span>Certify {files.length > 1 ? `${files.length} Files` : (isLive ? 'Live Capture' : 'Document')}</span>
               <ArrowRight size={16} />
             </button>
          </div>
        )}

        {isProcessing && (
           <div className="space-y-8">
             <div className="space-y-4">
               <div className="flex items-center gap-4">
                 <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                 <div>
                   <h3 className="font-serif text-2xl text-white">{getStepMessage()}</h3>
                   <p className="text-neutral-500 text-sm mt-1">Please don't close this page</p>
                 </div>
               </div>
               <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden">
                 <div className="h-full bg-orange-600 animate-pulse" style={{ width: '60%' }}></div>
               </div>
             </div>

             {/* File status list during processing */}
             <div className="space-y-2 max-h-48 overflow-y-auto">
               {files.map((f, i) => (
                 <div key={i} className="flex items-center gap-3 p-2 text-sm">
                   {f.status === 'done' ? (
                     <Check size={14} className="text-green-500" />
                   ) : f.status === 'hashing' || f.status === 'reading' ? (
                     <Loader2 size={14} className="text-orange-500 animate-spin" />
                   ) : (
                     <div className="w-3.5 h-3.5 rounded-full border border-neutral-700" />
                   )}
                   <span className={f.status === 'done' ? 'text-neutral-400' : 'text-neutral-600'}>
                     {f.file.name}
                   </span>
                   {f.hash && (
                     <span className="text-neutral-700 font-mono text-[10px] ml-auto">
                       {f.hash.slice(0, 8)}...
                     </span>
                   )}
                 </div>
               ))}
             </div>
           </div>
        )}

        {status === 'COMPLETE' && (
           <div className="space-y-8">
             <div className="p-6 md:p-8 border border-white/10 bg-white/5 relative overflow-hidden">
                {isSimulation && (
                  <div className="absolute top-0 right-0 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 border border-yellow-500/50 px-2 py-1 rounded bg-yellow-500/10">Demo Mode</span>
                  </div>
                )}
                
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center shrink-0">
                    <Check className="text-green-500" size={24} />
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl md:text-3xl text-white">Certified.</h3>
                    <p className="text-neutral-400 text-sm mt-1">
                      {isBatch 
                        ? `${files.length} documents are now permanently recorded on the blockchain.`
                        : isSimulation 
                          ? "Proof generated in local simulation mode. This record exists only in this browser."
                          : "This document is now permanently recorded on the Polygon blockchain."
                      }
                    </p>
                  </div>
                </div>
                
                {/* Single file actions */}
                {!isBatch && (
                  <div className="flex flex-col gap-3">
                    {certificateUrl && (
                      <a 
                        href={certificateUrl} 
                        download={`origynl-certificate-${files[0]?.file.name || 'document'}.pdf`}
                        className="flex items-center justify-between w-full py-4 px-6 bg-orange-600 hover:bg-orange-700 text-white transition-colors text-xs uppercase tracking-widest font-bold"
                      >
                        <span className="flex items-center gap-2">
                          <Award size={16} />
                          Download Certificate
                        </span>
                        <Download size={14} /> 
                      </a>
                    )}

                    <a 
                      href={processedImage || '#'} 
                      download={`origynl-stamped.${isPDF ? 'pdf' : 'jpg'}`}
                      className={`flex items-center justify-between w-full py-4 px-6 transition-colors text-xs uppercase tracking-widest font-bold ${certificateUrl ? 'border border-white/10 hover:bg-white/5 text-neutral-400' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
                    >
                      <span>Download Stamped File</span>
                      <Download size={14} /> 
                    </a>

                    <button 
                      onClick={copyLink}
                      className="flex items-center justify-between w-full py-4 px-6 border border-white/10 hover:bg-white/5 text-neutral-400 transition-colors text-xs uppercase tracking-widest"
                    >
                      <span>Copy Verification Link</span>
                      {copied ? <CheckCheck size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>

                    {!isSimulation && txId && (
                      <a 
                        href={`https://amoy.polygonscan.com/tx/${txId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between w-full py-4 px-6 border border-white/10 hover:bg-white/5 text-neutral-400 transition-colors text-xs uppercase tracking-widest"
                      >
                        <span>View on Blockchain</span>
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                )}

                {/* Batch file downloads */}
                {isBatch && batchResult && (
                  <div className="space-y-3">
                    <div className="p-3 bg-neutral-900/50 border border-white/5">
                      <span className="text-xs text-neutral-600 uppercase tracking-widest">Transaction</span>
                      <a 
                        href={`https://amoy.polygonscan.com/tx/${batchResult.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-orange-600 hover:text-orange-500 font-mono truncate"
                      >
                        {batchResult.txHash}
                      </a>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {batchResult.proofs.map((proof, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-neutral-900/50 border border-white/5">
                          <FileText size={16} className="text-orange-600 shrink-0" />
                          <span className="text-sm text-neutral-300 truncate flex-1">{proof.fileName}</span>
                          <button
                            onClick={() => downloadBatchCertificate(proof)}
                            className="text-xs text-orange-600 hover:text-orange-500 uppercase tracking-widest font-bold flex items-center gap-2"
                          >
                            <Download size={12} />
                            PDF
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                 onClick={() => { setStatus('IDLE'); setFiles([]); resetState(); }}
                 className="flex items-center justify-between w-full py-4 px-6 border border-white/10 hover:bg-white/5 text-neutral-400 transition-colors text-xs uppercase tracking-widest mt-4"
                >
                  <span>Certify More Documents</span>
                  <RefreshCw size={14} />
                </button>
             </div>
           </div>
        )}
      </div>

      {/* Right Panel: Output */}
      <div className="bg-neutral-900/30 p-4 md:p-16 flex flex-col relative overflow-hidden min-h-[50vh] lg:min-h-0">
        <div className="relative z-10 flex-1 flex items-center justify-center border border-white/5 bg-neutral-950/50 backdrop-blur-sm p-4 shadow-2xl">
           {status === 'COMPLETE' && !isBatch && processedImage ? (
             isPDF ? (
               <div className="text-center space-y-4">
                 <FileText className="w-16 h-16 text-orange-600 mx-auto" />
                 <p className="text-white font-serif text-xl">PDF Stamped</p>
                 <p className="text-neutral-500 text-xs">Download to view</p>
               </div>
             ) : (
               <img src={processedImage} alt="Preview" className="max-w-full max-h-[40vh] md:max-h-[60vh] object-contain shadow-2xl border border-white/5" />
             )
           ) : status === 'COMPLETE' && isBatch ? (
             <div className="text-center space-y-4">
               <div className="w-20 h-20 rounded-full bg-green-900/20 flex items-center justify-center mx-auto">
                 <Files className="w-10 h-10 text-green-500" />
               </div>
               <p className="text-white font-serif text-xl">{files.length} Documents Certified</p>
               <p className="text-neutral-500 text-xs">Download individual certificates from the left panel</p>
             </div>
           ) : isProcessing ? (
             <div className="text-center space-y-4">
               <Loader2 className="w-12 h-12 text-orange-600 mx-auto animate-spin" />
               <p className="text-neutral-500 text-sm">{getStepMessage()}</p>
             </div>
           ) : (
             <div className="text-center text-neutral-700 space-y-2">
               <span className="font-serif text-4xl text-neutral-800 opacity-50">O.</span>
               <p className="font-mono text-[10px] uppercase tracking-widest pt-4">Waiting for Input</p>
             </div>
           )}
        </div>

        <div className="mt-4 md:mt-8 pt-4 md:pt-8 border-t border-white/5 font-mono text-[10px] text-neutral-500 grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="min-w-0">
             <span className="block text-neutral-600 uppercase mb-1 font-bold">{isBatch ? 'Batch Root Hash' : 'SHA-256 Checksum'}</span>
             <span className="block text-neutral-400 break-all text-[9px] md:text-[10px]">{hash || "—"}</span>
           </div>
           <div className="min-w-0">
             <span className="block text-neutral-600 uppercase mb-1 font-bold">Ledger Ref</span>
             {txId ? (
               isSimulation ? (
                 <div className="flex flex-col gap-1">
                   <span className="text-yellow-500 font-bold">SIMULATED ID (LOCAL)</span>
                   <span className="block text-neutral-500 break-all opacity-50 text-[9px]">{txId}</span>
                 </div>
               ) : (
                 <a 
                   href={`https://amoy.polygonscan.com/tx/${txId}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="flex items-center gap-2 text-orange-600 hover:text-orange-500 transition-colors break-all group"
                 >
                   <span className="line-clamp-1 text-[9px] md:text-[10px]">{txId}</span>
                   <ExternalLink size={10} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                 </a>
               )
             ) : (
               <span className="block text-neutral-400">—</span>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};
