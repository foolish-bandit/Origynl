import React, { useEffect, useState } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { TweaksPanel, Accent, Density } from './TweaksPanel';

export type Variant = 'A' | 'B';
export type Theme = 'dark' | 'light';

type Ctx = {
  variant: Variant;
  setVariant: (v: Variant) => void;
};
export const VariantContext = React.createContext<Ctx>({
  variant: 'A',
  setVariant: () => {},
});

const ACCENT_MAP: Record<Accent, { seal: string; wash: string }> = {
  orange: { seal: 'oklch(0.72 0.17 55)', wash: 'oklch(0.72 0.17 55 / 0.1)' },
  blue: { seal: 'oklch(0.70 0.17 250)', wash: 'oklch(0.70 0.17 250 / 0.1)' },
  green: { seal: 'oklch(0.78 0.18 150)', wash: 'oklch(0.78 0.18 150 / 0.1)' },
  mono: { seal: 'oklch(0.8 0 0)', wash: 'oklch(0.8 0 0 / 0.1)' },
};

function readLS<T extends string>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return (v as T) || fallback;
  } catch {
    return fallback;
  }
}

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [variant, setVariant] = useState<Variant>(() => readLS<Variant>('origynl.variant', 'A'));
  const [theme, setTheme] = useState<Theme>(() => readLS<Theme>('origynl.theme', 'dark'));
  const [accent, setAccent] = useState<Accent>(() => readLS<Accent>('origynl.accent', 'orange'));
  const [density, setDensity] = useState<Density>(() => readLS<Density>('origynl.density', 'comfy'));
  const [openTweaks, setOpenTweaks] = useState(false);

  useEffect(() => {
    localStorage.setItem('origynl.variant', variant);
  }, [variant]);

  useEffect(() => {
    localStorage.setItem('origynl.theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('origynl.accent', accent);
    const { seal, wash } = ACCENT_MAP[accent];
    document.documentElement.style.setProperty('--seal', seal);
    document.documentElement.style.setProperty('--seal-wash', wash);
  }, [accent]);

  useEffect(() => {
    localStorage.setItem('origynl.density', density);
    document.documentElement.style.setProperty(
      '--grid',
      density === 'dense' ? '6px' : '8px',
    );
  }, [density]);

  return (
    <VariantContext.Provider value={{ variant, setVariant }}>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg)',
          color: 'var(--ink)',
        }}
      >
        <Nav
          theme={theme}
          setTheme={setTheme}
          variant={variant}
          setVariant={setVariant}
          openTweaks={openTweaks}
          setOpenTweaks={setOpenTweaks}
        />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer />
        <TweaksPanel
          open={openTweaks}
          setOpen={setOpenTweaks}
          theme={theme}
          setTheme={setTheme}
          variant={variant}
          setVariant={setVariant}
          accent={accent}
          setAccent={setAccent}
          density={density}
          setDensity={setDensity}
        />
      </div>
    </VariantContext.Provider>
  );
};
