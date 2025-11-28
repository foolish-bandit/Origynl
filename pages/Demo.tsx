import React, { useState, useRef, useEffect } from 'react';
import { Upload, ArrowRight, Pencil, RotateCcw, AlertTriangle } from 'lucide-react';
import { computeFileHash } from '../services/hashService';

export const Demo: React.FC = () => {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalHash, setOriginalHash] = useState<string>('');
  const [modifiedHash, setModifiedHash] = useState<string>('');
  const [originalPreview, setOriginalPreview] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasModified, setHasModified] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image for this demo');
        return;
      }

      setOriginalFile(file);
      setHasModified(false);
      setModifiedHash('');

      // Compute original hash
      const hash = await computeFileHash(file);
      setOriginalHash(hash);

      // Load image to canvas
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (canvas) {
            // Set canvas size to match image (max 600px)
            const maxSize = 600;
            const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
          }
        };
        img.src = event.target?.result as string;
        setOriginalPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = async () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      setHasModified(true);
      
      // Compute new hash from modified canvas
      const canvas = canvasRef.current;
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'modified.png', { type: 'image/png' });
          const hash = await computeFileHash(file);
          setModifiedHash(hash);
        }
      });
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    // Scale coordinates
    x = x * (canvas.width / rect.width);
    y = y * (canvas.height / rect.height);

    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  };

  const resetCanvas = () => {
    if (originalPreview && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          }
        }
      };
      img.src = originalPreview;
      setHasModified(false);
      setModifiedHash('');
    }
  };

  const highlightDifferences = () => {
    if (!originalHash || !modifiedHash) return null;
    
    const chars = [];
    for (let i = 0; i < originalHash.length; i++) {
      const isChanged = originalHash[i] !== modifiedHash[i];
      chars.push(
        <span key={i} className={isChanged ? 'text-red-500 font-bold' : 'text-neutral-600'}>
          {modifiedHash[i]}
        </span>
      );
    }
    return chars;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-16">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 md:mb-12 text-center">
          <span className="text-orange-600 text-[10px] uppercase tracking-widest font-bold mb-2 block">Interactive Demo</span>
          <h1 className="font-serif text-3xl md:text-5xl text-white mb-4">See Why This Matters</h1>
          <p className="text-neutral-500 font-light max-w-xl mx-auto text-sm md:text-base">
            Upload any image, then draw on it. Watch how even a tiny change completely transforms the fingerprint. 
            This is why certified documents can't be forged.
          </p>
        </div>

        {!originalFile ? (
          /* Upload section */
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-neutral-800 hover:border-orange-600 hover:bg-white/5 transition-all p-12 md:p-16 text-center cursor-pointer"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange}
              accept="image/*"
            />
            <div className="w-16 h-16 rounded-full border border-neutral-800 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-6 h-6 text-neutral-500" />
            </div>
            <p className="text-neutral-400 mb-2">Upload any image to start</p>
            <p className="text-neutral-600 text-xs">We'll show you how fingerprints work</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Canvas section */}
            <div className="bg-neutral-900/50 border border-white/5 p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Pencil size={16} className="text-orange-600" />
                  <span className="text-sm text-white font-bold">Draw on the image</span>
                </div>
                <button 
                  onClick={resetCanvas}
                  className="text-xs text-neutral-500 hover:text-orange-600 flex items-center gap-2"
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              </div>
              
              <div className="flex justify-center bg-neutral-950 p-4 border border-white/5">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                  className="max-w-full cursor-crosshair touch-none"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              
              <p className="text-neutral-600 text-xs text-center mt-3">
                Draw anywhere on the image — even a single pixel changes the fingerprint
              </p>
            </div>

            {/* Hash comparison */}
            <div className="grid md:grid-cols-2 gap-4">
              
              {/* Original hash */}
              <div className="p-4 md:p-6 bg-neutral-900/50 border border-white/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-neutral-400 uppercase tracking-widest font-bold">Original Fingerprint</span>
                </div>
                <p className="font-mono text-[10px] text-neutral-500 break-all leading-relaxed">
                  {originalHash}
                </p>
              </div>

              {/* Modified hash */}
              <div className={`p-4 md:p-6 border ${hasModified ? 'bg-red-950/20 border-red-900/50' : 'bg-neutral-900/50 border-white/5'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${hasModified ? 'bg-red-500 animate-pulse' : 'bg-neutral-700'}`}></div>
                  <span className="text-xs text-neutral-400 uppercase tracking-widest font-bold">
                    {hasModified ? 'Modified Fingerprint' : 'Waiting for changes...'}
                  </span>
                </div>
                <p className="font-mono text-[10px] break-all leading-relaxed">
                  {hasModified ? highlightDifferences() : (
                    <span className="text-neutral-700">Draw on the image above</span>
                  )}
                </p>
              </div>
            </div>

            {/* Explanation */}
            {hasModified && (
              <div className="p-4 md:p-6 border border-orange-600/30 bg-orange-950/10">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="text-orange-600 shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="text-white font-bold mb-2">Every character changed.</h3>
                    <p className="text-neutral-400 text-sm">
                      Even though you only changed a few pixels, the entire fingerprint is completely different. 
                      This is called the "avalanche effect" — it's why you can't forge a certified document. 
                      Any modification, no matter how small, produces a completely different fingerprint that won't match the blockchain record.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Try another */}
            <button 
              onClick={() => { setOriginalFile(null); setOriginalHash(''); setModifiedHash(''); setHasModified(false); }}
              className="w-full py-4 border border-white/10 hover:bg-white/5 text-neutral-400 transition-colors uppercase tracking-widest text-xs font-bold"
            >
              Try Another Image
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
