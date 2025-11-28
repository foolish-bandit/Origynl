
import React, { useState } from 'react';
import { Search, Check, X, Upload, ShieldCheck, ExternalLink, MapPin, Radio, FileSearch, Zap, FileCheck, Database } from 'lucide-react';
import { computeFileHash } from '../services/hashService';
import { findRecordByHash } from '../services/chainService';
import { extractHashFromMetadata } from '../services/imageService';
import { VerificationResult, VerificationStatus } from '../types';

export const Verify: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [inputHash, setInputHash] = useState('');
  const [result, setResult] = useState<VerificationResult>({ status: VerificationStatus.IDLE });
  const [processStep, setProcessStep] = useState<'IDLE' | 'ANALYZING' | 'HASHING' | 'LOOKUP'>('IDLE');
  const [verifiedByMetadata, setVerifiedByMetadata] = useState(false);

  const handleVerify = async (fileToVerify?: File, hashToVerify?: string) => {
    setResult({ status: VerificationStatus.PROCESSING });
    setVerifiedByMetadata(false);

    try {
      let targetHash = hashToVerify || '';

      if (fileToVerify) {
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
          await new Promise(resolve => setTimeout(resolve, 500));
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

  const isLoading = processStep !== 'IDLE';

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 md:p-16 w-full max-w-7xl mx-auto">
      
      <div className="w-full max-w-2xl mb-16 text-center space-y-4">
        <h1 className="font-serif text-5xl md:text-6xl text-white">Registry Search</h1>
        <p className="text-neutral-500 font-light">
          Verify the authenticity of any asset stamped by Origynl.
        </p>
      </div>

      <div className="w-full max-w-3xl space-y-8">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-900 blur opacity-20 group-hover:opacity-30 transition-opacity duration-500 rounded-lg"></div>
          <div className="relative bg-neutral-950 border border-white/10 p-2 flex items-center">
            <div className="flex-1 flex items-center gap-4 px-4">
               <Search className="text-neutral-600" size={20} />
               <input 
                 type="text" 
                 placeholder="Search Hash ID or Ledger Ref..." 
                 className="bg-transparent w-full py-4 text-white placeholder-neutral-700 font-mono text-sm focus:outline-none"
                 value={inputHash}
                 onChange={(e) => setInputHash(e.target.value)}
               />
            </div>
            
            <div className="h-8 w-px bg-white/10 mx-2"></div>

            <label className="flex items-center gap-2 px-6 py-2 cursor-pointer hover:bg-white/5 transition-colors rounded-sm">
               <input type="file" className="hidden" onChange={handleFileDrop} />
               <Upload size={16} className="text-neutral-400" />
               <span className="text-xs uppercase tracking-widest text-neutral-400">Upload</span>
            </label>

            <button 
              onClick={() => handleVerify(undefined, inputHash)}
              disabled={!inputHash || isLoading}
              className="bg-white text-black px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors"
            >
              Verify
            </button>
          </div>
        </div>
      </div>

      <div className="mt-24 w-full max-w-xl transition-all duration-700 ease-out transform">
        
        {isLoading && (
           <div className="flex flex-col items-center space-y-6">
             <div className="w-12 h-12 border-2 border-white/10 border-t-orange-600 rounded-full animate-spin"></div>
             <span className="font-mono text-xs uppercase tracking-widest text-neutral-500 animate-pulse">
               {processStep === 'ANALYZING' ? 'Extracting Metadata...' : 
                processStep === 'HASHING' ? 'Calculating Checksum...' : 
                'Auditing Blockchain Ledger...'}
             </span>
           </div>
        )}

        {!isLoading && result.status === VerificationStatus.AUTHENTIC && (
          <div className={`bg-[#fcfbf9] text-black p-8 md:p-12 shadow-2xl relative border-t-4 ${result.originalRecord?.isSimulation ? 'border-yellow-500' : 'border-orange-600'}`}>
            
            {/* Live Capture Ribbon */}
            {result.originalRecord?.provenanceType === 'LIVE_CAPTURE' && (
              <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-600 text-white rounded-sm shadow-lg">
                   <Radio size={14} className="animate-pulse" />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Witness Verified</span>
                </div>
              </div>
            )}

            {/* Simulation Ribbon */}
            {result.originalRecord?.isSimulation && (
              <div className="absolute top-0 left-0 p-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500 text-black rounded-sm shadow-lg">
                   <Database size={14} />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Local Simulation</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-start mb-8">
               <div>
                 <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className={result.originalRecord?.isSimulation ? "text-yellow-600" : "text-orange-600"} size={20} />
                    <span className={`text-xs uppercase tracking-widest font-bold ${result.originalRecord?.isSimulation ? "text-yellow-600" : "text-orange-600"}`}>Authentic Asset</span>
                 </div>
                 <h2 className="font-serif text-3xl font-bold text-neutral-900">Verification Success</h2>
                 {verifiedByMetadata && (
                   <div className="mt-2 flex items-center gap-2 text-neutral-500">
                     <FileSearch size={12} />
                     <span className="text-[10px] uppercase tracking-wide">Matched via Embedded Metadata</span>
                   </div>
                 )}
               </div>
            </div>

            <div className="space-y-6 font-mono text-xs uppercase tracking-wide bg-neutral-100 p-6 border border-neutral-200">
              
              <div className="flex items-center gap-3 pb-4 border-b border-neutral-200">
                 {result.originalRecord?.provenanceType === 'LIVE_CAPTURE' ? (
                   <>
                     <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                        <Zap size={16} />
                     </div>
                     <div>
                       <span className="block text-neutral-500 text-[9px]">Provenance Tier</span>
                       <span className="font-bold text-orange-600">Live Witness Protocol</span>
                     </div>
                   </>
                 ) : (
                   <>
                     <div className="p-2 bg-neutral-200 rounded-full text-neutral-600">
                        <FileCheck size={16} />
                     </div>
                     <div>
                       <span className="block text-neutral-500 text-[9px]">Provenance Tier</span>
                       <span className="font-bold text-neutral-800">Standard Digital Audit</span>
                     </div>
                   </>
                 )}
              </div>

              {result.originalRecord?.geoTag && (
                 <div className="flex items-center gap-2 pb-4 border-b border-neutral-200">
                    <MapPin size={14} className="text-neutral-500" />
                    <div>
                      <span className="block text-neutral-500 text-[9px]">Capture Location</span>
                      <span className="font-bold text-neutral-800">{result.originalRecord.geoTag}</span>
                    </div>
                 </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div>
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
                       <span className="line-clamp-1 break-all">{result.originalRecord?.sender}</span>
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

              <div>
                 <span className="block text-neutral-500 text-[10px] mb-1">File Checksum (SHA-256)</span>
                 <span className="block font-bold break-all leading-relaxed text-neutral-600">{result.originalRecord?.hash}</span>
              </div>
            </div>

            <div className="mt-8 text-center">
               <p className="font-serif italic text-sm text-neutral-500">
                 {result.originalRecord?.isSimulation 
                   ? "Record verified against local demo session storage."
                   : "Record verified against immutable Polygon ledger."}
               </p>
            </div>
          </div>
        )}

        {!isLoading && result.status === VerificationStatus.NOT_FOUND && (
          <div className="border border-red-900/50 bg-red-950/10 p-8 md:p-12 text-center">
             <X className="w-12 h-12 text-red-600 mx-auto mb-6 opacity-50" />
             <h2 className="font-serif text-3xl text-white mb-4">Verification Failed</h2>
             <p className="text-neutral-400 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
               The file metadata does not contain a registered hash, or the visual content has been altered since notarization.
             </p>
             <div className="font-mono text-[10px] text-neutral-500 uppercase">
               Checked Hash: <span className="text-red-400 break-all">{result.currentHash}</span>
