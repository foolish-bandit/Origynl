import React, { useEffect, useState } from 'react';

export function useNetworkTick() {
  const [block, setBlock] = useState(58_234_119);
  const [gas, setGas] = useState(31.4);
  useEffect(() => {
    const t = setInterval(() => {
      setBlock((b) => b + 1);
      setGas((g) => Math.max(20, Math.min(60, g + (Math.random() - 0.5) * 2)));
    }, 4200);
    return () => clearInterval(t);
  }, []);
  return { block, gas };
}

export const InstrumentBar: React.FC = () => {
  const { block, gas } = useNetworkTick();
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const utc = time.toISOString().replace('T', ' ').slice(0, 19) + 'Z';
  return (
    <div
      className="instrument-bar"
      style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}
    >
      <span>
        <span
          className="pulsedot"
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--ok)',
            marginRight: 8,
            verticalAlign: 'middle',
          }}
        />
        NETWORK
        <b style={{ marginLeft: 8 }}>POLYGON AMOY</b>
      </span>
      <span>
        BLOCK
        <b style={{ marginLeft: 8 }}>#{block.toLocaleString()}</b>
      </span>
      <span>
        GAS
        <b style={{ marginLeft: 8 }}>{gas.toFixed(1)} GWEI</b>
      </span>
      <span>
        LEDGER
        <b style={{ marginLeft: 8 }}>0x894C…9d41</b>
      </span>
      <span style={{ marginLeft: 'auto' }}>
        UTC
        <b style={{ marginLeft: 8 }}>{utc}</b>
      </span>
    </div>
  );
};
