
import React, { useState, useRef, useEffect } from 'react';
import { Upload, ArrowRight, Download, RefreshCw, Share2, FileText, Mail, Linkedin, ExternalLink, MapPin, Radio, AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { computeFileHash, computeCompositeHash } from '../services/hashService';
import { writeHashToChain } from '../services/chainService';
import { embedWatermark, embedMetadata } from '../services/imageService';
import { SensorData } from '../types';

export const Certify: React.FC = () => {
  const location = useLocation();
  
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'HASHING' | 'MINING' | 'WATERMARKING' | 'COMPLETE'>('IDLE');
  const [hash, setHash] = useState<string>('');
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [txId, setTxId] = useState<string>('');
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
      setHash('');
      setTxId('');
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
      setIsSimulation(!!chainRecord.isSimulation);

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
      <div className="p-8 md:p-16 border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col justify-center">
        
        <div className="mb-12">
           <span className="text-orange-600 text-[10px] uppercase tracking-widest font-bold mb-2 block">Step 01</span>
           <h1 className="font-serif text-5xl text-white mb-4">Stamp & Seal</h1>
           <p className="text-neutral-500 font-light max-w-sm">
             {isLive 
               ? "Witness Data detected. We will bind the sensor telemetry to the image hash for Tier-1 verification." 
               : "Upload a contract, photo, or invoice. We will calculate the cryptographic hash and anchor it to the ledger."
             }
           </p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-900/50 flex items-start gap-4">
            <AlertTriangle className="text-red-500 shrink-0" size={20} />
            <div className="space-y-1">
              <h4 className="text-red-500 font-bold text-xs uppercase tracking-widest">Process Error</h4>
              <p className="text-red-400 text-xs font-mono">{error}</p>
            </div>
          </div>
        )}

        {status === 'IDLE' && (
          <div className="space-y-8">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`group border border-dashed hover:border-orange-600 hover:bg-white/5 transition-all duration-500 aspect-video md:aspect-square lg:aspect-[4/3] flex flex-col items-center justify-center cursor-pointer relative ${isLive ? 'border-orange-600/50 bg-orange-900/5' : 'border-neutral-800'}`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
                accept="image/jpeg,image/png,application/pdf"
              />
              {file ? (
                <div className="text-center z-10 p-8">
                   {isLive && (
                     <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-600/20 border border-orange-600/50 rounded-full mb-4">
                       <Radio size={12} className="text-orange-500 animate-pulse" />
                       <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Live Capture Data</span>
                     </div>
                   )}
                   <p className="font-serif text-2xl text-white italic mb-2 break-all">{file.name}</p>
                   <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">{file.type} • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full border border-neutral-800 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500">
                    <Upload className="w-6 h-6 text-neutral-500 group-hover:text-orange-600 transition-colors" />
                  </div>
                  <p className="text-neutral-500 text-xs tracking-widest uppercase">Drop File Here</p>
                </div>
              )}
            </div>

            <button 
               onClick={startProcess}
               disabled={!file}
               className="w-full py-6 bg-white hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-700 disabled:cursor-not-allowed text-black transition-all duration-300 uppercase tracking-widest text-xs font-bold flex justify-between px-8"
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
             <div className="p-8 border border-white/10 bg-white/5 relative overflow-hidden">
                {isSimulation && (
                  <div className="absolute top-0 right-0 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-500 border border-yellow-500/50 px-2 py-1 rounded bg-yellow-500/10">Demo Mode</span>
                  </div>
                )}
                
                <h3 className="font-serif text-3xl text-white mb-2">Authenticated.</h3>
                <p className="text-neutral-400 text-sm mb-6">
                  {isSimulation 
                    ? "Proof generated in local simulation mode. This record exists only in this browser."
                    : "Proof anchored permanently to the Polygon Amoy Network."}
                </p>
                
                <div className="flex flex-col gap-3">
                  <a 
                    href={processedImage || '#'} 
                    download={`origynl-stamped.${isPDF ? 'pdf' : 'jpg'}`}
                    className="flex items-center justify-between w-full py-4 px-6 bg-orange-600 hover:bg-orange-700 text-white transition-colors text-xs uppercase tracking-widest font-bold"
                  >
                    <span>Download Stamped File</span>
                    <Download size={14} /> 
                  </a>

                  <button 
                   onClick={() => { setStatus('IDLE'); setFile(null); setProcessedImage(null); }}
                   className="flex items-center justify-between w-full py-4 px-6 border border-white/10 hover:bg-white/5 text-neutral-400 transition-colors text-xs uppercase tracking-widest mt-4"
                  >
                    <span>Process Another</span>
                    <RefreshCw size={14} />
                  </button>
                </div>
             </div>
           </div>
        )}
      </div>

      {/* Right Panel: Output */}
      <div className="bg-neutral-900/30 p-8 md:p-16 flex flex-col relative overflow-hidden">
        <div className="relative z-10 flex-1 flex items-center justify-center border border-white/5 bg-neutral-950/50 backdrop-blur-sm p-4 shadow-2xl">
           {processedImage ? (
             <img src={processedImage} alt="Preview" className="max-w-full max-h-[60vh] object-contain shadow-2xl border border-white/5" />
           ) : (
             <div className="text-center text-neutral-700 space-y-2">
               <span className="font-serif text-4xl text-neutral-800 opacity-50">O.</span>
               <p className="font-mono text-[10px] uppercase tracking-widest pt-4">Waiting for Input</p>
             </div>
           )}
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 font-mono text-[10px] text-neutral-500 grid grid-cols-2 gap-4">
           <div>
             <span className="block text-neutral-600 uppercase mb-1 font-bold">SHA-256 Checksum</span>
             <span className="block text-neutral-400 break-all">{hash || "—"}</span>
           </div>
           <div>
             <span className="block text-neutral-600 uppercase mb-1 font-bold">Ledger Ref</span>
             {txId ? (
               isSimulation ? (
                 <div className="flex flex-col gap-1">
                   <span className="text-yellow-500 font-bold">SIMULATED ID (LOCAL)</span>
                   <span className="block text-neutral-500 break-all opacity-50">{txId}</span>
                 </div>
               ) : (
                 <a 
                   href={`https://amoy.polygonscan.com/tx/${txId}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="flex items-center gap-2 text-orange-600 hover:text-orange-500 transition-colors break-all group"
                 >
                   <span className="line-clamp-1">{txId}</span>
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
