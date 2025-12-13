
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Scale, FileCheck, AlertTriangle, Building2, Landmark, Clock, Lock, CheckCircle, XCircle, HelpCircle, FlaskConical, Bot, Sparkles, ScanLine, Database } from 'lucide-react';

export const Home: React.FC = () => {
  const scrollToHow = () => {
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative w-full overflow-hidden bg-neutral-950">
      
      {/* Prototype Banner */}
      <div className="bg-orange-600 text-white text-center py-2 px-4">
        <p className="text-xs md:text-sm font-medium flex items-center justify-center gap-2">
          <FlaskConical size={14} />
          <span>This is a working prototype. We're actively developing Origynl.</span>
        </p>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center px-4 md:px-6 overflow-hidden py-20 md:py-0">
        
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>

        <div className="absolute inset-0 bg-radial-gradient from-transparent via-neutral-950/40 to-neutral-950 z-10 pointer-events-none"></div>

        <div className="relative z-20 text-center max-w-4xl space-y-6 md:space-y-8">
          
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-neutral-200 leading-[1.1] tracking-tight">
            Prove Your Documents<br/>
            <span className="text-orange-600">Are Real, Not AI.</span>
          </h1>

          <p className="font-sans font-light text-neutral-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed px-4">
            Anyone can fake a document now. Origynl gives you <span className="text-white">undeniable proof</span> that
            your contracts, photos, and records existed at a specific moment in time, <span className="text-white">aren't AI-generated</span>, and haven't been changed since.
          </p>

          {/* AI Detection Badge */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 border border-orange-600/40 rounded-full">
              <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
                Multi-Factor AI Detection
              </span>
            </div>
          </div>

          <div className="pt-6 md:pt-8 flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center px-4">
            <Link to="/certify" className="group relative px-8 md:px-10 py-4 md:py-5 bg-orange-600 hover:bg-orange-700 text-white overflow-hidden w-full sm:w-auto transition-colors">
               <span className="relative z-10 flex items-center justify-center gap-4 text-sm font-bold uppercase tracking-widest">
                 Try It Now <ArrowRight size={16}/>
               </span>
            </Link>

            <button onClick={scrollToHow} className="group px-8 py-4 md:py-5 border border-white/20 hover:border-orange-600 text-white transition-all w-full sm:w-auto">
               <span className="text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3 group-hover:text-orange-600 transition-colors">
                 How It Works
               </span>
            </button>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-neutral-900/50 border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-serif text-3xl md:text-5xl text-white mb-4">
              The Problem
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              AI has made it impossible to tell real from fake.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            
            <div className="bg-neutral-950 border border-red-900/30 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="text-red-500" size={24} />
                <h3 className="font-serif text-xl text-white">What AI Can Fake Today</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "Signed contracts that never existed",
                  "Photos of damage that never happened",
                  "Invoices and receipts for fake transactions", 
                  "Medical records and prescriptions",
                  "Screenshots of conversations",
                  "Videos of events that never occurred"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-neutral-400">
                    <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-neutral-950 border border-white/10 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <HelpCircle className="text-neutral-500" size={24} />
                <h3 className="font-serif text-xl text-white">The Old Ways Don't Work</h3>
              </div>
              <ul className="space-y-4">
                {[
                  { old: "Check the metadata", problem: "Can be edited in seconds" },
                  { old: "Look at the file date", problem: "Easily changed" },
                  { old: "Trust the source", problem: "Emails and accounts get hacked" },
                  { old: "Get it notarized", problem: "Only proves who signed, not when created" },
                  { old: "Use digital signatures", problem: "Can be added to forged documents" },
                ].map((item, i) => (
                  <li key={i} className="text-neutral-400">
                    <span className="text-white">{item.old}</span>
                    <span className="text-neutral-600 mx-2">→</span>
                    <span className="text-red-400">{item.problem}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* The Solution Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-neutral-950">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-serif text-3xl md:text-5xl text-white mb-4">
              The Solution
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              A timestamp that can't be faked, changed, or deleted.
            </p>
          </div>

          <div className="bg-neutral-900/50 border border-orange-600/30 p-6 md:p-10">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              
              <div className="space-y-6">
                <h3 className="font-serif text-2xl md:text-3xl text-white">
                  What is blockchain, simply?
                </h3>
                <div className="space-y-4 text-neutral-300 leading-relaxed">
                  <p>
                    Think of it as a <span className="text-white">public record book</span> that thousands of computers 
                    around the world all maintain together.
                  </p>
                  <p>
                    When you certify a document with Origynl, we create a unique "fingerprint" of your file and 
                    write it into this record book with a timestamp.
                  </p>
                  <p>
                    <span className="text-orange-500">No one can edit it. No one can delete it. No one can backdate it.</span> Not 
                    us, not hackers, not even governments. It's permanent.
                  </p>
                </div>
              </div>

              <div className="bg-neutral-950 border border-white/10 p-6 space-y-4">
                <div className="flex items-center gap-3 text-green-500">
                  <CheckCircle size={20} />
                  <span className="text-sm font-medium">What This Proves</span>
                </div>
                <ul className="space-y-3 text-neutral-300">
                  <li className="flex items-start gap-3">
                    <Clock size={16} className="text-orange-600 mt-1 shrink-0" />
                    <span><strong className="text-white">When:</strong> The exact date and time your document existed</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <FileCheck size={16} className="text-orange-600 mt-1 shrink-0" />
                    <span><strong className="text-white">What:</strong> The exact contents at that moment</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Lock size={16} className="text-orange-600 mt-1 shrink-0" />
                    <span><strong className="text-white">Unchanged:</strong> Any modification would be detected</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Detection Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-gradient-to-b from-orange-950/20 to-neutral-950 border-y border-orange-600/20">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-12 md:mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Bot className="w-8 h-8 text-orange-500" />
              <h2 className="font-serif text-3xl md:text-5xl text-white">
                Advanced AI Detection
              </h2>
            </div>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Multi-factor analysis to detect AI-generated content and ensure authenticity
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-10">

            {/* AI Detection Features */}
            <div className="bg-neutral-950 border border-orange-600/30 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <ScanLine className="text-orange-500" size={24} />
                <h3 className="font-serif text-xl text-white">What We Analyze</h3>
              </div>
              <ul className="space-y-4">
                {[
                  { title: "Visual Artifacts", desc: "AI generation patterns in images" },
                  { title: "Metadata Forensics", desc: "Hidden AI tool signatures and inconsistencies" },
                  { title: "Compression Analysis", desc: "Unnatural uniformity common in AI images" },
                  { title: "Noise Patterns", desc: "Artificial vs. natural sensor noise" },
                  { title: "Text Patterns", desc: "AI-typical writing styles and phrases" },
                  { title: "Creation Context", desc: "Missing camera/device information" }
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-neutral-400">
                    <CheckCircle size={18} className="text-orange-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-white font-medium">{item.title}:</span>
                      <span className="ml-2">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Authenticity Score */}
            <div className="bg-neutral-950 border border-white/10 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Database className="text-green-500" size={24} />
                <h3 className="font-serif text-xl text-white">Multi-Factor Score</h3>
              </div>
              <div className="space-y-6">
                <p className="text-neutral-300 leading-relaxed">
                  Every verified file receives a comprehensive <span className="text-white font-bold">Authenticity Score (0-100)</span> based on:
                </p>
                <div className="space-y-4">
                  {[
                    { factor: "Blockchain Certification", weight: "40%", color: "text-blue-400" },
                    { factor: "AI Detection Analysis", weight: "30%", color: "text-orange-400" },
                    { factor: "Metadata Authenticity", weight: "20%", color: "text-purple-400" },
                    { factor: "Forensic Analysis", weight: "10%", color: "text-green-400" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-neutral-300">{item.factor}</span>
                      <span className={`font-bold ${item.color}`}>{item.weight}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-neutral-400 italic">
                    Files receive color-coded trust levels from <span className="text-green-500">AUTHENTIC</span> to <span className="text-red-500">AI GENERATED/FAKE</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center bg-orange-600/10 border border-orange-600/30 p-8 rounded-lg">
            <h3 className="font-serif text-2xl text-white mb-3">
              Try AI Detection Now
            </h3>
            <p className="text-neutral-300 mb-6 max-w-xl mx-auto">
              Upload any file to get instant AI detection analysis plus blockchain certification
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/verify" className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                <ScanLine size={16} />
                Verify & Analyze File
              </Link>
              <Link to="/certify" className="px-8 py-4 border border-white/20 hover:border-orange-600 text-white text-sm font-bold uppercase tracking-widest transition-all">
                Certify New File
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 md:py-24 px-4 md:px-8 bg-neutral-900/30 border-y border-white/5">
         <div className="max-w-5xl mx-auto">
            
            <div className="text-center mb-12 md:mb-16">
              <h2 className="font-serif text-3xl md:text-5xl text-white mb-4">
                How It Works
              </h2>
              <p className="text-neutral-400 text-lg">
                Three steps. Under a minute. No technical knowledge needed.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {[
                { 
                  num: "1", 
                  title: "Upload Your Document", 
                  description: "Drag and drop any file—contracts, photos, PDFs, spreadsheets. Your file never leaves your device.",
                  note: "We don't store your documents"
                },
                { 
                  num: "2", 
                  title: "We Create a Fingerprint", 
                  description: "We generate a unique code from your file. Like a fingerprint, no two documents have the same code.",
                  note: "Even a tiny change creates a different fingerprint"
                },
                { 
                  num: "3", 
                  title: "Permanently Recorded", 
                  description: "The fingerprint and timestamp are written to the blockchain. You get a certificate as proof.",
                  note: "Verifiable by anyone, forever"
                }
              ].map((step, i) => (
                <div key={i} className="bg-neutral-950 border border-white/5 p-6 md:p-8 relative">
                  <div className="text-5xl md:text-6xl font-serif text-neutral-800 absolute top-4 right-4">{step.num}</div>
                  <div className="relative z-10">
                    <h3 className="font-serif text-xl text-white mb-3 pr-12">{step.title}</h3>
                    <p className="text-neutral-400 mb-4 leading-relaxed">{step.description}</p>
                    <p className="text-xs text-orange-600 uppercase tracking-wide">{step.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link to="/certify" className="inline-flex items-center gap-3 px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold uppercase tracking-widest transition-colors">
                Try It Now <ArrowRight size={16} />
              </Link>
            </div>
         </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-neutral-950">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-serif text-3xl md:text-5xl text-white mb-4">
              Who Is This For?
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Anyone who needs to prove a document is authentic.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Scale,
                title: "Lawyers & Legal Teams",
                situations: [
                  "Prove when a contract was signed",
                  "Preserve evidence the moment you receive it",
                  "Timestamp settlement agreements",
                  "Document chain of custody"
                ]
              },
              {
                icon: Building2,
                title: "Insurance Professionals", 
                situations: [
                  "Verify claim photos aren't AI-generated",
                  "Timestamp damage assessments",
                  "Prove when reports were created",
                  "Detect fraudulent documentation"
                ]
              },
              {
                icon: Landmark,
                title: "Accountants & Auditors",
                situations: [
                  "Lock down financials at period end",
                  "Create immutable audit trails",
                  "Timestamp compliance documents",
                  "Prove records weren't backdated"
                ]
              },
              {
                icon: Shield,
                title: "Business Owners",
                situations: [
                  "Protect intellectual property",
                  "Timestamp invention disclosures",
                  "Prove when designs were created",
                  "Document trade secrets"
                ]
              }
            ].map((useCase, i) => (
              <div key={i} className="bg-neutral-900/50 border border-white/5 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <useCase.icon className="text-orange-600" size={24} />
                  <h3 className="font-serif text-xl text-white">{useCase.title}</h3>
                </div>
                <ul className="space-y-2">
                  {useCase.situations.map((situation, j) => (
                    <li key={j} className="flex items-start gap-3 text-neutral-400">
                      <CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" />
                      <span>{situation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-neutral-900/30 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="font-serif text-3xl md:text-4xl text-white">
            Try It Yourself
          </h2>
          <p className="text-neutral-400 max-w-xl mx-auto leading-relaxed">
            This prototype is fully functional. Upload any document and see how it works.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/certify" className="px-10 py-5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold uppercase tracking-widest transition-colors">
              Certify a Document
            </Link>
            <Link to="/verify" className="px-10 py-5 border border-white/20 hover:border-white/40 text-white text-sm font-bold uppercase tracking-widest transition-colors">
              Verify a Document
            </Link>
          </div>
          <div className="pt-6">
            <Link to="/demo" className="text-neutral-500 hover:text-orange-600 text-sm transition-colors inline-flex items-center gap-2">
              <span>See why tampering is impossible</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
