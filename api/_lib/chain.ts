import { fallback, http, createPublicClient, createWalletClient, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'polygon-amoy',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-amoy.polygon.technology'] },
    public: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  },
  testnet: true,
} as const;

export const LEDGER_ABI = parseAbi([
  'function certify(string calldata _hash) external',
  'function verify(string calldata _hash) external view returns (bool, uint256, address)',
]);

const PUBLIC_RPC = 'https://rpc-amoy.polygon.technology';

function rpcEndpoints(): string[] {
  const endpoints: string[] = [];
  if (process.env.AMOY_RPC_URL) endpoints.push(process.env.AMOY_RPC_URL);
  if (process.env.ALCHEMY_AMOY_URL) endpoints.push(process.env.ALCHEMY_AMOY_URL);
  if (process.env.ANKR_AMOY_URL) endpoints.push(process.env.ANKR_AMOY_URL);
  endpoints.push(PUBLIC_RPC);
  return endpoints;
}

export function amoyTransport() {
  const endpoints = rpcEndpoints();
  const transports = endpoints.map((url) =>
    http(url, { timeout: 15_000, retryCount: 2, retryDelay: 500 })
  );
  return transports.length > 1 ? fallback(transports, { rank: false }) : transports[0];
}

export function publicAmoyClient() {
  return createPublicClient({ chain: polygonAmoy, transport: amoyTransport() });
}

export function sanitizePrivateKey(raw: string | undefined): `0x${string}` | null {
  if (!raw) return null;
  let key = raw.trim().replace(/^["']|["']$/g, '');
  if (!key.startsWith('0x')) key = `0x${key}`;
  if (key.length !== 66) return null;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
  return key as `0x${string}`;
}

export function walletAmoyClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return {
    account,
    client: createWalletClient({ account, chain: polygonAmoy, transport: amoyTransport() }),
  };
}
