
import React from 'react';
import { Shield, Camera, FileText, PenTool } from 'lucide-react';

export const Examples: React.FC = () => {
  const cases = [
    {
      category: "Legal & Compliance",
      title: "Contract Execution",
      desc: "A signed PDF contract is hashed immediately upon execution. This hash serves as indisputable proof that the document has not been altered since the signing date.",
      icon: Shield,
      meta: "SHA-256 / PDF-A"
    },
    {
      category: "Insurance",
      title: "Damage Assessment",
      desc: "Field agents upload photos of property damage. The embedded blockchain timestamp prevents metadata spoofing, validating the exact time of the incident capture.",
      icon: Camera,
      meta: "EXIF / GEO"
    },
    {
      category: "Journalism",
      title: "Source Protection",
      desc: "Investigative journalists stamp whistle-blower documents. This proves possession of the information at a specific date while keeping the content private until publication.",
      icon: FileText,
      meta: "ANONYMOUS / ENCRYPTED"
    },
    {
      category: "Fine Art",
      title: "Digital Editions",
      desc: "Digital artists certify limited editions. The hash acts as a digital signature, allowing collectors to verify they own a true original from the artist's studio.",
      icon: PenTool,
      meta: "PROVENANCE / NFT"
    }
  ];

  return (
    <div className="min-h-screen">
      <div className="p-8 md:p-16 border-b border-white/5">
        <h1 className="font-serif text-5xl md:text-6xl text-white mb-6">Case Studies</h1>
        <p className="text-neutral-500 font-light max-w-2xl text-lg">
          Origynl is industry-agnostic. From the courtroom to the gallery, our protocol provides the standard for verification.
        </p>
      </div>

      <div className="grid md:grid-cols-2">
        {cases.map((c, i) => (
          <div key={i} className={`p-12 border-b border-white/5 ${i % 2 === 0 ? 'md:border-r' : ''} group hover:bg-white/[0.02] transition-colors`}>
             <div className="flex justify-between items-start mb-12">
               <div className="p-4 bg-neutral-900 rounded-full text-orange-600 group-hover:text-white group-hover:bg-orange-600 transition-colors">
                 <c.icon size={24} />
               </div>
               <span className="font-mono text-[10px] text-neutral-600 border border-neutral-800 px-2 py-1 rounded">
                 {c.meta}
               </span>
             </div>
             
             <span className="text-orange-600 text-[10px] uppercase tracking-widest font-bold block mb-3">
               {c.category}
             </span>
             <h3 className="font-serif text-3xl text-white mb-4">{c.title}</h3>
             <p className="text-neutral-400 leading-relaxed font-light">
               {c.desc}
             </p>
          </div>
        ))}
      </div>

      <div className="p-16 text-center bg-white/5 border-b border-white/5">
         <h2 className="font-serif text-3xl text-white mb-8">Ready to secure your workflow?</h2>
         <a href="#/certify" className="inline-block bg-white text-black px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-colors">
           Start Stamping Now
         </a>
      </div>
    </div>
  );
};
