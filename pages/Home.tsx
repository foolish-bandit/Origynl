
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Fingerprint, Aperture, FileText, Globe } from 'lucide-react';

const FloatingCard = ({ src, delay, duration, rotateStart, rotateEnd, left, right, scale, opacity }: any) => (
  <div 
    className="floating-item absolute border border-white/10 bg-neutral-900 shadow-2xl overflow-hidden"
    style={{
      '--delay': delay,
      '--duration': duration,
      '--r-start': rotateStart,
      '--r-end': rotateEnd,
      '--opacity': opacity,
      left: left,
      right: right,
      width: `calc(240px * ${scale})`,
      height: `calc(320px * ${scale})`,
      zIndex: 0
    } as React.CSSProperties}
  >
    <div className="absolute inset-0 bg-neutral-950/20 z-10"></div>
    {/* Image layer with blend mode */}
    <div 
      className="w-full h-full bg-cover bg-center grayscale contrast-125 hover:grayscale-0 transition-all duration-1000 ease-in-out"
      style={{ backgroundImage: `url(${src})` }}
    ></div>
    {/* Analog artifacts */}
    <div className="absolute top-4 left-4 w-full h-px bg-white/20"></div>
    <div className="absolute bottom-4 right-4 font-mono text-[8px] text-orange-600 tracking-widest bg-black/50 px-2">
      ORIGINAL_SEQ_{Math.floor(Math.random() * 9999)}
    </div>
  </div>
);

export const Home: React.FC = () => {
  const scrollToProcess = () => {
    const el = document.getElementById('process');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative w-full overflow-hidden bg-neutral-950">
      <style>{`
        @keyframes drift {
          0% { transform: translateY(110vh) rotate(var(--r-start)); opacity: 0; }
          15% { opacity: var(--opacity); }
          85% { opacity: var(--opacity); }
          100% { transform: translateY(-120vh) rotate(var(--r-end)); opacity: 0; }
        }
        .floating-item {
          animation: drift var(--duration) linear infinite;
          animation-delay: var(--delay);
          opacity: 0;
        }
        .blend-text {
          mix-blend-mode: overlay;
        }
      `}</style>
      
      {/* Immersive Hero */}
      <section className="relative min-h-screen flex flex-col justify-center items-center px-4 md:px-6 overflow-hidden py-20 md:py-0">
        
        {/* Background Animation Layer - Hidden on mobile for performance */}
        <div className="absolute inset-0 pointer-events-none select-none hidden md:block">
           <FloatingCard 
             src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop"
             delay="0s" duration="28s" rotateStart="-5deg" rotateEnd="10deg" left="10%" scale="1.2" opacity="0.6"
           />
           <FloatingCard 
             src="https://images.unsplash.com/photo-1605152276897-4f618f831968?q=80&w=800&auto=format&fit=crop"
             delay="-5s" duration="35s" rotateStart="5deg" rotateEnd="-8deg" right="15%" scale="1" opacity="0.5"
           />
           <FloatingCard 
             src="https://images.unsplash.com/photo-1532153955177-f59af40d6472?q=80&w=800&auto=format&fit=crop"
             delay="-15s" duration="40s" rotateStart="-2deg" rotateEnd="-5deg" left="35%" scale="0.9" opacity="0.3"
           />
           <FloatingCard 
             src="https://images.unsplash.com/photo-1543362906-ac1b48263852?q=80&w=800&auto=format&fit=crop"
             delay="-2s" duration="32s" rotateStart="15deg" rotateEnd="5deg" right="5%" scale="0.8" opacity="0.4"
           />
           <FloatingCard 
             src="https://images.unsplash.com/photo-1478720568477-152d9b164e63?q=80&w=800&auto=format&fit=crop"
             delay="-10s" duration="45s" rotateStart="-10deg" rotateEnd="0deg" left="5%" scale="1.1" opacity="0.25"
           />
        </div>

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-neutral-950/40 to-neutral-950 z-10 pointer-events-none"></div>

        {/* Text Content */}
        <div className="relative z-20 text-center max-w-5xl space-y-6 md:space-y-10">
          
          <div className="flex flex-col items-center gap-4 animate-pulse-slow">
            <div className="h-12 md:h-16 w-px bg-gradient-to-b from-transparent via-orange-600 to-transparent"></div>
            <p className="font-mono text-[9px] md:text-[10px] text-orange-600 uppercase tracking-[0.3em] md:tracking-[0.4em]">
               Provenance Protocol 1.0
            </p>
          </div>
          
          <h1 className="font-serif text-4xl md:text-8xl lg:text-9xl text-neutral-200 leading-[0.9] md:leading-[0.85] tracking-tighter mix-blend-lighten">
            The Fragility <br/>
            <span className="italic font-light text-neutral-500">of the</span> Real.
          </h1>

          <p className="font-sans font-light text-neutral-400 text-base md:text-xl max-w-lg mx-auto leading-relaxed px-4">
             In an age of infinite copies, the original is the only masterpiece.
             We provide the digital glass and steel to protect your truth from the noise.
          </p>

          <div className="pt-8 md:pt-12 flex flex-col sm:flex-row gap-4 md:gap-8 justify-center items-center px-4">
            <Link to="/certify" className="group relative px-8 md:px-10 py-4 md:py-5 bg-neutral-100 text-black overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.1)] w-full sm:w-auto">
               <div className="absolute inset-0 bg-orange-600 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
               <span className="relative z-10 flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                 Authenticate File <ArrowRight size={14}/>
               </span>
            </Link>

            <button onClick={scrollToProcess} className="group px-8 py-4 md:py-5 border-b border-white/20 hover:border-orange-600 text-white transition-all w-full sm:w-auto">
               <span className="text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 group-hover:text-orange-600 transition-colors">
                 See How It Works <Fingerprint size={14} className="text-neutral-500 group-hover:text-orange-600 transition-colors"/>
               </span>
            </button>
          </div>
        </div>

        {/* Ghost Text Overlay */}
        <div className="absolute bottom-12 right-12 text-right hidden md:block opacity-30 select-none pointer-events-none z-0">
          <p className="font-serif text-9xl text-transparent stroke-white stroke-1 opacity-10">TRUTH</p>
        </div>
      </section>

      {/* The Darkroom Process Section */}
      <section id="process" className="py-20 md:py-40 px-4 md:px-8 relative z-20 bg-neutral-950 border-t border-white/5">
         <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 md:gap-24 items-center">
               
               <div className="space-y-10 md:space-y-16">
                  <div>
                    <span className="text-orange-600 text-[10px] uppercase tracking-widest font-bold mb-4 block">The Methodology</span>
                    <h2 className="font-serif text-4xl md:text-7xl text-white leading-[0.9]">
                      Developing <br/> <span className="text-neutral-600 italic">Certainty.</span>
                    </h2>
                  </div>
                  
                  <div className="space-y-8 md:space-y-12">
                     {[
                       { icon: Aperture, title: "Exposure", text: "Your document is chemically analyzed by our cryptographic engine (SHA-256), creating a unique digital negative." },
                       { icon: Globe, title: "Fixative", text: "We anchor this negative to the blockchain, creating a decentralized timestamp that resists censorship and decay." },
                       { icon: FileText, title: "Print", text: "The proof is developed back into the file's metadata and surface. A permanent seal of provenance." }
                     ].map((item, i) => (
                       <div key={i} className="group flex gap-4 md:gap-8 items-start border-l border-white/10 pl-4 md:pl-8 hover:border-orange-600 transition-colors duration-500">
                          <span className="text-xs font-mono text-neutral-600 group-hover:text-orange-600 transition-colors mt-1">0{i+1}</span>
                          <div className="space-y-2">
                             <h3 className="font-serif text-xl md:text-2xl text-white group-hover:text-orange-500 transition-colors">{item.title}</h3>
                             <p className="text-neutral-500 font-light text-sm leading-relaxed max-w-sm">{item.text}</p>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>

               {/* Visual Abstract */}
               <div className="relative h-[400px] md:h-[600px] w-full border border-white/5 bg-white/[0.01] flex items-center justify-center p-8 overflow-hidden group">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517502474097-f9b30659dadb?q=80&w=1200&auto=format&fit=crop')] opacity-20 bg-cover bg-center grayscale mix-blend-overlay group-hover:scale-105 transition-transform duration-[2s]"></div>
                  
                  {/* Grid Lines */}
                  <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
                  
                  {/* Center Graphic */}
                  <div className="relative z-10 w-48 h-48 md:w-64 md:h-64 border border-orange-600/30 rounded-full flex items-center justify-center animate-[spin_20s_linear_infinite]">
                     <div className="w-36 h-36 md:w-48 md:h-48 border border-white/10 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-orange-600 rounded-full shadow-[0_0_20px_#ea580c]"></div>
                     </div>
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 md:h-8 bg-orange-600"></div>
                     <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-6 md:h-8 bg-orange-600"></div>
                  </div>
                  
                  <div className="absolute bottom-4 md:bottom-8 left-4 md:left-8 font-mono text-[8px] md:text-[9px] text-neutral-500 uppercase tracking-widest">
                     System Status: <span className="text-green-500">Online</span><br/>
                     Last Block: #159203
                  </div>
               </div>

            </div>
         </div>
      </section>

    </div>
  );
};
