
import React, { useState, useRef } from 'react';
import { Search, Check, X, Upload, ShieldCheck, ExternalLink, MapPin, Radio, FileSearch, Zap, FileCheck, Database, FileText, Bot, Sparkles } from 'lucide-react';
import { computeFileHash } from '../services/hashService';
import { findRecordByHash } from '../services/chainService';
import { extractHashFromMetadata } from '../services/imageService';
import { analyzeAuthenticity, AuthenticityAnalysis } from '../services/authenticityService';
import { AuthenticityReport } from '../components/AuthenticityReport';
import { VerificationResult, VerificationStatus } from '../types';

export const Verify: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [inputHash, setInputHash] = useState('');
  const [result, setResult] = useState<VerificationResult>({ status: VerificationStatus.IDLE });
  const [processStep, setProcessStep] = useState<'IDLE' | 'READING' | 'ANALYZING' | 'HASHING' | 'LOOKUP' | 'AI_DETECTION' | 'SCORING'>('IDLE');
  const [verifiedByMetadata, setVerifiedByMetadata] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [authenticityAnalysis, setAuthenticityAnalysis] = useState<AuthenticityAnalysis | null>(null);
  const [useEnhancedAnalysis, setUseEnhancedAnalysis] = useState(true);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleVerify = async (fileToVerify?: File, hashToVerify?: string) => {
    setResult({ status: VerificationStatus.PROCESSING });
    setVerifiedByMetadata(false);
    setAuthenticityAnalysis(null);

    try {
      let targetHash = hashToVerify || '';

      if (fileToVerify) {
        setProcessStep('READING');
        await new Promise(resolve => setTimeout(resolve, 300));

        setProcessStep('ANALYZING');

        // 1. Try to extract hash from metadata first
        const embeddedHash = await extractHashFromMetadata(fileToVerify);

        if (embeddedHash) {
          console.log("Found Embedded Hash:", embeddedHash);
          targetHash = embeddedHash;
          setVerifiedByMetadata(true);
        } else {
          // 2. Fallback to raw content hashing
          setProcessStep('HASHING');
          await new Promise(resolve => setTimeout(resolve, 400));
          targetHash = await computeFileHash(fileToVerify);
        }
      } else if (!hashToVerify && inputHash) {
        targetHash = inputHash.trim();
      }

      if (!targetHash) {
        setProcessStep('IDLE');
        setResult({ status: VerificationStatus.IDLE });
        return;
      }

      setProcessStep('LOOKUP');
      const record = await findRecordByHash(targetHash);

      // Enhanced analysis if file is provided and enabled
      if (fileToVerify && useEnhancedAnalysis) {
        setProcessStep('AI_DETECTION');
        await new Promise(resolve => setTimeout(resolve, 500));

        setProcessStep('SCORING');
        const analysis = await analyzeAuthenticity(
          fileToVerify,
          !!record,
          record?.timestamp
        );
        setAuthenticityAnalysis(analysis);
      }

      if (record) {
        setResult({
          status: VerificationStatus.AUTHENTIC,
          originalRecord: record,
          currentHash: targetHash
        });
      } else {
        setResult({
          status: VerificationStatus.NOT_FOUND,
          currentHash: targetHash
        });
      }

    } catch (e) {
      console.error(e);
      setResult({ status: VerificationStatus.IDLE });
    } finally {
      setProcessStep('IDLE');
    }
  };

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      handleVerify(f);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setFile(f);
      handleVerify(f);
    }
  };

  const isLoading = processStep !== 'IDLE';

  const getStepMessage = () => {
    switch (processStep) {
      case 'READING': return 'Reading file...';
      case 'ANALYZING': return 'Checking for embedded certificate...';
      case 'HASHING': return 'Computing fingerprint...';
      case 'LOOKUP': return 'Searching blockchain records...';
      case 'AI_DETECTION': return 'Analyzing for AI-generated content...';
      case 'SCORING': return 'Calculating authenticity score...';
      default: return '';
    }
  };

  return (
    <div 
      ref={dropZoneRef}
      className={`flex flex-col items-center justify-center min-h-[80vh] p-4 md:p-16 w-full max-w-7xl mx-auto transition-all duration-300 ${isDragging ? 'bg-orange-600/5' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-orange-600 rounded-lg p-16 text-center">
            <Upload className="w-16 h-16 text-orange-600 mx-auto mb-4" />
            <p className="text-2xl text-white font-serif">Drop file to verify</p>
            <p className="text-neutral-400 mt-2">We'll check if it's been certified</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl mb-8 md:mb-16 text-center space-y-4 px-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <h1 className="font-serif text-4xl md:text-6xl text-white">Verify Authenticity</h1>
          <div className="relative group">
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-orange-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 text-[10px] bg-orange-600 text-white px-1 rounded-full font-bold">AI</span>
          </div>
        </div>
        <p className="text-neutral-500 font-light text-sm md:text-base">
          Drop a file anywhere on this page to check if it's been certified and verify it's not AI-generated.
        </p>
        <div className="flex items-center justify-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={useEnhancedAnalysis}
              onChange={(e) => setUseEnhancedAnalysis(e.target.checked)}
              className="w-4 h-4 accent-orange-600"
            />
            <span className="text-xs text-neutral-400 group-hover:text-white transition-colors flex items-center gap-1">
              <Bot size={14} />
              Enhanced AI Detection
            </span>
          </label>
        </div>
      </div>

      <div className="w-full max-w-3xl space-y-4 md:space-y-8 px-4">
        
        {/* Drop zone card */}
        <label className="block cursor-pointer group">
          <input type="file" className="hidden" onChange={handleFileDrop} />
          <div className="border border-dashed border-neutral-800 hover:border-orange-600 hover:bg-orange-600/5 transition-all p-8 text-center">
            <div className="w-14 h-14 rounded-full border border-neutral-800 group-hover:border-orange-600 flex items-center justify-center mx-auto mb-4 transition-colors">
              <FileText className="w-6 h-6 text-neutral-600 group-hover:text-orange-600 transition-colors" />
            </div>
            <p className="text-neutral-400 group-hover:text-white transition-colors">Drop a file here or click to browse</p>
            <p className="text-neutral-600 text-xs mt-2">We'll compute its fingerprint and search the blockchain</p>
          </div>
        </label>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-neutral-800"></div>
          <span className="text-neutral-600 text-xs uppercase tracking-widest">or search by hash</span>
          <div className="flex-1 h-px bg-neutral-800"></div>
        </div>

        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-900 blur opacity-20 group-hover:opacity-30 transition-opacity duration-500 rounded-lg"></div>
          
          {/* Mobile-friendly search layout */}
          <div className="relative bg-neutral-950 border border-white/10 p-2 flex flex-col md:flex-row md:items-center gap-2">
            
            {/* Search Input */}
            <div className="flex-1 flex items-center gap-3 px-3 md:px-4">
               <Search className="text-neutral-600 shrink-0" size={20} />
               <input 
                 type="text" 
                 placeholder="File hash or transaction ID (0x...)..." 
                 className="bg-transparent w-full py-3 md:py-4 text-white placeholder-neutral-700 font-mono text-sm focus:outline-none"
                 value={inputHash}
                 onChange={(e) => setInputHash(e.target.value)}
               />
            </div>
            
            {/* Action button */}
            <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-white/10 pt-2 md:pt-0 md:pl-2">
              <button 
                onClick={() => handleVerify(undefined, inputHash)}
                disabled={!inputHash || isLoading}
                className="bg-white text-black px-6 md:px-8 py-3 md:py-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1 md:flex-none"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 md:mt-24 w-full max-w-3xl transition-all duration-700 ease-out transform px-4">
        
        {isLoading && (
           <div className="flex flex-col items-center space-y-6">
             <div className="w-12 h-12 border-2 border-white/10 border-t-orange-600 rounded-full animate-spin"></div>
             <span className="font-mono text-xs uppercase tracking-widest text-neutral-500 animate-pulse text-center">
               {getStepMessage()}
             </span>
             {file && (
               <span className="text-neutral-600 text-xs">{file.name}</span>
             )}
           </div>
        )}

        {!isLoading && result.status === VerificationStatus.AUTHENTIC && authenticityAnalysis && (
          <AuthenticityReport
            score={authenticityAnalysis.authenticityScore}
            fileName={file?.name}
            blockchainTxHash={result.originalRecord?.hash}
            blockchainTimestamp={result.originalRecord?.timestamp}
            isSimulation={result.originalRecord?.isSimulation}
          />
        )}

        {!isLoading && result.status === VerificationStatus.AUTHENTIC && !authenticityAnalysis && (
          <div className={`bg-[#fcfbf9] text-black p-6 md:p-12 shadow-2xl relative border-t-4 ${result.originalRecord?.isSimulation ? 'border-yellow-500' : 'border-orange-600'}`}>
            
            {/* Live Capture Ribbon */}
            {result.originalRecord?.provenanceType === 'LIVE_CAPTURE' && (
              <div className="absolute top-0 right-0 p-2 md:p-4">
                <div className="flex items-center gap-2 px-2 md:px-3 py-1 bg-orange-600 text-white rounded-sm shadow-lg">
                   <Radio size={14} className="animate-pulse" />
                   <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Witness Verified</span>
                </div>
              </div>
            )}

            {/* Simulation Ribbon */}
            {result.originalRecord?.isSimulation && (
              <div className="absolute top-0 left-0 p-2 md:p-4">
                <div className="flex items-center gap-2 px-2 md:px-3 py-1 bg-yellow-500 text-black rounded-sm shadow-lg">
                   <Database size={14} />
                   <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Local Simulation</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-start mb-6 md:mb-8 mt-8 md:mt-0">
               <div>
                 <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className={result.originalRecord?.isSimulation ? "text-yellow-600" : "text-orange-600"} size={20} />
                    <span className={`text-xs uppercase tracking-widest font-bold ${result.originalRecord?.isSimulation ? "text-yellow-600" : "text-orange-600"}`}>Authentic Asset</span>
                 </div>
                 <h2 className="font-serif text-2xl md:text-3xl font-bold text-neutral-900">Verification Success</h2>
                 {verifiedByMetadata && (
                   <div className="mt-2 flex items-center gap-2 text-neutral-500">
                     <FileSearch size={12} />
                     <span className="text-[10px] uppercase tracking-wide">Matched via Embedded Metadata</span>
                   </div>
                 )}
                 {file && (
                   <div className="mt-2 text-neutral-500 text-xs">
                     File: {file.name}
                   </div>
                 )}
               </div>
            </div>

            <div className="space-y-4 md:space-y-6 font-mono text-xs uppercase tracking-wide bg-neutral-100 p-4 md:p-6 border border-neutral-200">
              
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-200">
                 {result.originalRecord?.provenanceType === 'LIVE_CAPTURE' ? (
                   <>
                     <div className="p-2 bg-orange-100 rounded-full text-orange-600 shrink-0">
                        <Zap size={16} />
                     </div>
                     <div className="min-w-0">
                       <span className="block text-neutral-500 text-[9px]">Provenance Tier</span>
                       <span className="font-bold text-orange-600">Live Witness Protocol</span>
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="p-2 bg-neutral-200 rounded-full text-neutral-600 shrink-0">
                        <FileCheck size={16} />
                     </div>
                     <div className="min-w-0">
                       <span className="block text-neutral-500 text-[9px]">Provenance Tier</span>
                       <span className="font-bold text-neutral-800">Standard Digital Audit</span>
                     </div>
                   </>
                 )}
              </div>

              {result.originalRecord?.geoTag && (
                 <div className="flex items-center gap-2 pb-4 border-b border-neutral-200">
                    <MapPin size={14} className="text-neutral-500 shrink-0" />
                    <div className="min-w-0">
                      <span className="block text-neutral-500 text-[9px]">Capture Location</span>
                      <span className="font-bold text-neutral-800">{result.originalRecord.geoTag}</span>
                    </div>
                 </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="min-w-0">
                   <span className="block text-neutral-500 text-[10px] mb-1">Originator</span>
                   {result.originalRecord?.isSimulation ? (
                     <span className="font-bold text-neutral-900">{result.originalRecord.sender}</span>
                   ) : (
                     <a 
                        href={`https://amoy.polygonscan.com/address/${result.originalRecord?.sender}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-bold text-neutral-900 hover:text-orange-600 transition-colors"
                     >
                       <span className="truncate">{result.originalRecord?.sender}</span>
                       <ExternalLink size={10} className="shrink-0" />
                     </a>
                   )}
                 </div>
                 <div>
                   <span className="block text-neutral-500 text-[10px] mb-1">Block Height</span>
                   {result.originalRecord?.isSimulation ? (
                     <span className="font-bold text-neutral-900">N/A (Local)</span>
                   ) : (
                     <a 
                        href={`https://amoy.polygonscan.com/block/${result.originalRecord?.blockHeight}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-bold text-neutral-900 hover:text-orange-600 transition-colors"
                     >
                        <span>#{result.originalRecord?.blockHeight}</span>
                     </a>
                   )}
                 </div>
              </div>

              <div className="min-w-0">
                 <span className="block text-neutral-500 text-[10px] mb-1">File Checksum (SHA-256)</span>
                 <span className="block font-bold break-all leading-relaxed text-neutral-600 text-[10px] md:text-xs">{result.originalRecord?.hash}</span>
              </div>
            </div>

            <div className="mt-6 md:mt-8 text-center">
               <p className="font-serif italic text-sm text-neutral-500">
                 {result.originalRecord?.isSimulation 
                   ? "Record verified against local demo session storage."
                   : "Record verified against immutable Polygon ledger."}
               </p>
            </div>
          </div>
        )}

        {!isLoading && result.status === VerificationStatus.NOT_FOUND && authenticityAnalysis && (
          <AuthenticityReport
            score={authenticityAnalysis.authenticityScore}
            fileName={file?.name}
            isSimulation={false}
          />
        )}

        {!isLoading && result.status === VerificationStatus.NOT_FOUND && !authenticityAnalysis && (
          <div className="border border-red-900/50 bg-red-950/10 p-6 md:p-12 text-center">
             <X className="w-12 h-12 text-red-600 mx-auto mb-6 opacity-50" />
             <h2 className="font-serif text-2xl md:text-3xl text-white mb-4">Not Found</h2>
             <p className="text-neutral-400 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
               This document has not been certified with Origynl, or the file has been modified since certification.
             </p>
             {file && (
               <p className="text-neutral-500 text-xs mb-4">File: {file.name}</p>
             )}
             <div className="font-mono text-[10px] text-neutral-500 uppercase">
               Checked Hash: <span className="text-red-400 break-all">{result.currentHash}</span>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

