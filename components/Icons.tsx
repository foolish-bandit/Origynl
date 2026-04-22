import React from 'react';

type IconProps = {
  size?: number;
  stroke?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

const Icon: React.FC<IconProps & { d?: string }> = ({
  d,
  size = 16,
  stroke = 1.5,
  children,
  className,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={style}
    aria-hidden="true"
  >
    {d ? <path d={d} /> : children}
  </svg>
);

export const IconArrow: React.FC<IconProps> = (p) => (
  <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>
);
export const IconArrowDown: React.FC<IconProps> = (p) => (
  <Icon {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Icon>
);
export const IconCheck: React.FC<IconProps> = (p) => (
  <Icon {...p}><path d="M4 12l5 5L20 6" /></Icon>
);
export const IconX: React.FC<IconProps> = (p) => (
  <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>
);
export const IconUpload: React.FC<IconProps> = (p) => (
  <Icon {...p}><path d="M12 3v12M7 8l5-5 5 5M4 17v3h16v-3" /></Icon>
);
export const IconFile: React.FC<IconProps> = (p) => (
  <Icon {...p}><path d="M14 3H7a1 1 0 00-1 1v16a1 1 0 001 1h10a1 1 0 001-1V8zM14 3v5h5" /></Icon>
);
export const IconSearch: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Icon>
);
export const IconCamera: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M3 7h3l2-3h8l2 3h3v12H3z" />
    <circle cx="12" cy="13" r="4" />
  </Icon>
);
export const IconMonitor: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <rect x="2" y="4" width="20" height="14" rx="1" />
    <path d="M8 21h8M12 18v3" />
  </Icon>
);
export const IconLock: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <rect x="5" y="11" width="14" height="10" rx="1" />
    <path d="M8 11V7a4 4 0 018 0v4" />
  </Icon>
);
export const IconMap: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M12 21s-7-7-7-12a7 7 0 0114 0c0 5-7 12-7 12z" />
    <circle cx="12" cy="9" r="2.5" />
  </Icon>
);
export const IconClock: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
export const IconExt: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M14 4h6v6M20 4l-9 9M10 4H5a1 1 0 00-1 1v14a1 1 0 001 1h14a1 1 0 001-1v-5" />
  </Icon>
);
export const IconDownload: React.FC<IconProps> = (p) => (
  <Icon {...p}><path d="M12 3v14M6 12l6 6 6-6M4 21h16" /></Icon>
);
export const IconCopy: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <rect x="8" y="8" width="12" height="12" rx="1" />
    <path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" />
  </Icon>
);
export const IconMenu: React.FC<IconProps> = (p) => (
  <Icon {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Icon>
);
export const IconChain: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 10-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 105.66 5.66l1-1" />
  </Icon>
);
export const IconSeal: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="9" r="6" />
    <path d="M9 14l-1 7 4-2 4 2-1-7" />
  </Icon>
);
export const IconCaret: React.FC<IconProps> = (p) => (
  <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>
);
export const IconRadio: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M5 12a7 7 0 0114 0M8 12a4 4 0 018 0" />
  </Icon>
);
export const IconSun: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
  </Icon>
);
export const IconMoon: React.FC<IconProps> = (p) => (
  <Icon {...p}><path d="M20 14A8 8 0 0110 4a8 8 0 1010 10z" /></Icon>
);
export const IconSliders: React.FC<IconProps> = (p) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
    <circle cx="8" cy="6" r="2" fill="var(--bg)" />
    <circle cx="14" cy="12" r="2" fill="var(--bg)" />
    <circle cx="18" cy="18" r="2" fill="var(--bg)" />
  </Icon>
);
export const IconSpinner: React.FC<IconProps> = (p) => (
  <Icon {...p}><path d="M12 3a9 9 0 019 9" strokeLinecap="round" /></Icon>
);

export const LogoMark: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ display: 'block' }} aria-hidden="true">
    <circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeWidth="1" />
    <circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
    <circle cx="20" cy="20" r="6" fill="var(--seal)" />
    <text x="20" y="24" textAnchor="middle" fontFamily="var(--serif)" fontSize="13" fill="#1a1300" style={{ fontWeight: 500 }}>
      O
    </text>
  </svg>
);
