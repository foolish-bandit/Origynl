
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => 
    location.pathname === path 
      ? "text-orange-600 opacity-100" 
      : "text-neutral-500 opacity-60 hover:opacity-100 hover:text-neutral-300";

  const navLinks = [
    { path: '/capture', label: 'Live Capture' },
    { path: '/certify', label: 'Stamp' },
    { path: '/verify', label: 'Registry' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans flex flex-col border-x border-white/5 max-w-[1600px] mx-auto box-border relative shadow-[0_0_100px_rgba(0,0,0,0.5)]">
      
      {/* Top Bar / Navigation */}
      <header className="sticky top-0 z-50 bg-neutral-950/90 backdrop-blur-md border-b border-white/5">
        <div className="flex justify-between items-stretch h-16 md:h-20">
          
          {/* Logo Area */}
          <Link 
            to="/" 
            className="flex items-center px-4 md:px-8 border-r border-white/5 hover:bg-white/5 transition-colors group"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="font-serif text-xl md:text-2xl font-bold tracking-tighter group-hover:text-orange-600 transition-colors">Origynl.</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex flex-1 justify-end items-center px-8 gap-12">
            {navLinks.map((link) => (
              <Link 
                key={link.path}
                to={link.path} 
                className={`text-[11px] uppercase tracking-[0.25em] font-medium transition-all duration-500 ${isActive(link.path)}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden flex items-center justify-center w-16 border-l border-white/5 hover:bg-white/5 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X size={24} className="text-white" />
            ) : (
              <Menu size={24} className="text-white" />
            )}
          </button>

        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-white/5 bg-neutral-950">
            {navLinks.map((link) => (
              <Link 
                key={link.path}
                to={link.path} 
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-6 py-4 text-sm uppercase tracking-widest font-medium border-b border-white/5 transition-all ${isActive(link.path)}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative">
        {children}
      </main>

      {/* Footer / Colophon */}
      <footer className="border-t border-white/5 py-12 md:py-24 px-6 md:px-16 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 bg-neutral-950">
        <div className="md:col-span-2 space-y-6 md:space-y-8">
          <h1 className="font-serif text-4xl md:text-7xl leading-none text-neutral-800 select-none tracking-tight">ORIGYNL.</h1>
          <p className="text-neutral-600 max-w-sm text-sm">
            Bridging the gap between creative expression and forensic certainty.
          </p>
        </div>
        
        <div className="space-y-4 md:space-y-6 pt-2">
          <h4 className="text-[10px] uppercase tracking-widest text-orange-600 font-bold">Protocol</h4>
          <ul className="space-y-2 text-sm text-neutral-500 font-mono">
             <li>SHA-256 Compliance</li>
             <li>Polygon PoS Ledger</li>
             <li>ISO 19005 (PDF/A) Ready</li>
             <li>Zero-Knowledge Privacy</li>
          </ul>
        </div>

        <div className="space-y-4 md:space-y-6 pt-2">
          <h4 className="text-[10px] uppercase tracking-widest text-orange-600 font-bold">Governance</h4>
          <ul className="space-y-2 text-sm text-neutral-500 font-mono">
             <li className="hover:text-white cursor-pointer transition-colors">Legal Terms</li>
             <li className="hover:text-white cursor-pointer transition-colors">Audit Reports</li>
             <li className="hover:text-white cursor-pointer transition-colors">Enterprise API</li>
          </ul>
        </div>
      </footer>
    </div>
  );
};
