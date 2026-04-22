import React from 'react';

type Props = { hash?: string; cells?: number };

export const HashStrip: React.FC<Props> = ({
  hash = 'a8f3b2c94e71d21ab009f43c2e5f7811a09ff21cc9000131a2b3c4d5500abef7',
  cells = 64,
}) => {
  const source = hash.replace(/^0x/, '').padEnd(cells, '0').slice(0, cells);
  const chars = source.split('');
  return (
    <div className="hash-strip" style={{ gridTemplateColumns: `repeat(${chars.length}, 1fr)` }}>
      {chars.map((c, i) => {
        const v = parseInt(c, 16);
        const pct = Number.isFinite(v) ? (v / 15) * 90 + 5 : 5;
        return (
          <div
            key={i}
            style={{
              aspectRatio: '1',
              background: `color-mix(in oklch, var(--seal) ${pct}%, var(--bg-2))`,
            }}
          />
        );
      })}
    </div>
  );
};
