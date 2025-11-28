
import React, { useState, useRef, useEffect } from 'react';
import { Upload, ArrowRight, Download, RefreshCw, Share2, FileText, Mail, Linkedin, ExternalLink, MapPin, Radio, AlertTriangle, Award } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { computeFileHash, computeCompositeHash } from '../services/hashService';
import { writeHashToChain } from '../services/chainService';
import { embedWatermark, embedMetadata } from '../services/imageService';
import { generateCertificate } from '../services/certificateService';
import { SensorData } from '../types';

export const Certify: React.FC = () => {
  const location = useLocation();
  
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'HASHING' | 'MINING' | 'WATERMARKING' | 'COMPLETE'>('IDLE');
  const [hash, setHash] = useState<string>('');
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [txId, setTxId] = useState<string>('');
  const [timestamp, setTimestamp] = useState<number>(0);
  const [isSimulation, setIsSimulation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Live Capture State
  const [isLive, setIsLive] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (location.state && location.state.file) {
      setFile(location.state.file);
      setIsLive(location.state.isLiveCapture || false);
      setSensorData(location.state.sensorData || null);
    }
  }, [location]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('IDLE');
      setProcessedImage(null);
      setProcessedBlob(null);
      setCertificateUrl(null);
      setHash('');
      setTxId('');
      setTimestamp(0);
      setIsSimulation(false);
      setError(null);
      setIsLive(false); 
      setSensorData(null);
    }
  };

  const startProcess = async () => {
    if (!file) return;
    setError(null);

    try {
      setStatus('HASHING');
      
      let finalHash: string;
      if (isLive && sensorData) {
        finalHash = await computeCompositeHash(file, sensorData);
      } else {
        finalHash = await computeFileHash(file);
      }
      
      setHash(finalHash);
      
      setStatus('MINING');
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

      // Generate PDF certificate
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

      setStatus('WATERMARKING');
      
      let finalUrl: string;
      let finalBlob: Blob;

      if (file.type.startsWith('image/')) {
        const stampText = isLive ? `LIVE PROOF: ${finalHash}` : finalHash;
        const watermarkedUrl = await embedWatermark(file, stampText);
        finalUrl = await embedMetadata(file, watermarkedUrl, finalHash);
      } else if (file.type === 'application/pdf') {
        finalUrl = await embedMetadata(file, null, finalHash);
      } else {
        finalUrl = URL.createObjectURL(file);
      }

      finalBlob = await fetch(finalUrl).then(r => r.blob());

      setProcessedImage(finalUrl);
      setProcessedBlob(finalBlob);
      setStatus('COMPLETE');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Processing failed. Please try again.');
      setStatus('IDLE');
    }
  };

  const isPDF = file?.type === 'application/pdf';

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
               : "Upload a contract, evidence photo, or any document. We'll create an immutable blockchain record proving it existed at this exact moment."
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
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`group border border-dashed hover:border-orange-600 hover:bg-white/5 transition-all duration-500 aspect-[4/3] md:aspect-square lg:aspect-[4/3] flex flex-col items-center justify-center cursor-pointer relative ${isLive ? 'border-orange-600/50 bg-orange-900/5' : 'border-neutral-800'}`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
                accept="image/jpeg,image/png,application/pdf"
              />
              {file ? (
                <div className="text-center z-10 p-4 md:p-8">
                   {isLive && (
                     <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-600/20 border border-orange-600/50 rounded-full mb-4">
                       <Radio size={12} className="text-orange-500 animate-pulse" />
                       <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Live Capture Data</span>
                     </div>
                   )}
                   <p className="font-serif text-xl md:text-2xl text-white italic mb-2 break-all">{file.name}</p>
                   <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">{file.type} • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-neutral-800 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500">
                    <Upload className="w-5 h-5 md:w-6 md:h-6 text-neutral-500 group-hover:text-orange-600 transition-colors" />
                  </div>
                  <p className="text-neutral-500 text-xs tracking-widest uppercase">Tap to Select File</p>
                </div>
              )}
            </div>

            <button 
               onClick={startProcess}
               disabled={!file}
               className="w-full py-5 md:py-6 bg-white hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-700 disabled:cursor-not-allowed text-black transition-all duration-300 uppercase tracking-widest text-xs font-bold flex justify-between px-6 md:px-8"
             >
               <span>Initialize {isLive ? 'Witness Seal' : 'Stamp'}</span>
               <ArrowRight size={16} />
             </button>
          </div>
        )}

        {(status !== 'IDLE' && status !== 'COMPLETE') && (
           <div className="space-y-12">
             <div className="space-y-4">
               <h3 className="font-serif text-3xl text-white animate-pulse">
                 {status === 'HASHING' && "Binding Telemetry..."}
                 {status === 'MINING' && "Notarizing on Chain..."}
                 {status === 'WATERMARKING' && "Applying Digital Seal..."}
               </h3>
               <div className="h-px w-full bg-neutral-900 overflow-hidden">
                 <div className="h-full bg-orange-600 w-1/3 animate-[shimmer_2s_infinite_linear]"></div>
               </div>
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
                
                <h3 className="font-serif text-2xl md:text-3xl text-white mb-2">Certified.</h3>
                <p className="text-neutral-400 text-sm mb-6">
                  {isSimulation 
                    ? "Proof generated in local simulation mode. This record exists only in this browser."
                    : "This document is now permanently recorded on the Polygon blockchain. Download your certificate as proof."}
                </p>
                
                <div className="flex flex-col gap-3">
                  {certificateUrl && (
                    <a 
                      href={certificateUrl} 
                      download={`origynl-certificate-${file?.name || 'document'}.pdf`}
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

                  <button 
                   onClick={() => { setStatus('IDLE'); setFile(null); setProcessedImage(null); setCertificateUrl(null); }}
                   className="flex items-center justify-between w-full py-4 px-6 border border-white/10 hover:bg-white/5 text-neutral-400 transition-colors text-xs uppercase tracking-widest mt-2"
                  >
                    <span>Certify Another</span>
                    <RefreshCw size={14} />
                  </button>
                </div>
             </div>
           </div>
        )}
      </div>

      {/* Right Panel: Output */}
      <div className="bg-neutral-900/30 p-4 md:p-16 flex flex-col relative overflow-hidden min-h-[50vh] lg:min-h-0">
        <div className="relative z-10 flex-1 flex items-center justify-center border border-white/5 bg-neutral-950/50 backdrop-blur-sm p-4 shadow-2xl">
           {processedImage ? (
             isPDF ? (
               <div className="text-center space-y-4">
                 <FileText className="w-16 h-16 text-orange-600 mx-auto" />
                 <p className="text-white font-serif text-xl">PDF Stamped</p>
                 <p className="text-neutral-500 text-xs">Download to view</p>
               </div>
             ) : (
               <img src={processedImage} alt="Preview" className="max-w-full max-h-[40vh] md:max-h-[60vh] object-contain shadow-2xl border border-white/5" />
             )
           ) : (
             <div className="text-center text-neutral-700 space-y-2">
               <span className="font-serif text-4xl text-neutral-800 opacity-50">O.</span>
               <p className="font-mono text-[10px] uppercase tracking-widest pt-4">Waiting for Input</p>
             </div>
           )}
        </div>

        <div className="mt-4 md:mt-8 pt-4 md:pt-8 border-t border-white/5 font-mono text-[10px] text-neutral-500 grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="min-w-0">
             <span className="block text-neutral-600 uppercase mb-1 font-bold">SHA-256 Checksum</span>
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
