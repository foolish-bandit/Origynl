/**
 * Merkle Tree Service
 *
 * Domain-separated binary Merkle tree over keccak256.
 *
 * Each leaf bytes `L` enters the tree as `keccak256(0x00 || L)` — the 0x00 byte
 * prevents a 64-byte internal-node hash from being interpreted as a leaf
 * preimage. Internal nodes are `keccak256(0x01 || sort(a, b))` with sort-pair
 * semantics so paths are order-independent.
 *
 * Odd levels promote the unpaired leaf instead of duplicating it (cheaper and
 * unambiguous). Output is lower-case hex without a 0x prefix so it round-trips
 * with the rest of the app's hash handling; helpers are exported for the
 * 0x-prefixed form when calling viem.
 */
import { keccak256, toBytes, bytesToHex } from 'viem';

const LEAF_PREFIX = 0x00;
const NODE_PREFIX = 0x01;

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error('Hex string must have even length');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

function bytesToUnprefixedHex(b: Uint8Array): string {
  return bytesToHex(b).slice(2);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function keccakBytes(input: Uint8Array): Uint8Array {
  return toBytes(keccak256(input));
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

export function hashLeaf(leafHex: string): string {
  const preimage = concat(new Uint8Array([LEAF_PREFIX]), hexToBytes(leafHex));
  return bytesToUnprefixedHex(keccakBytes(preimage));
}

export function hashInternalPair(aHex: string, bHex: string): string {
  const a = hexToBytes(aHex);
  const b = hexToBytes(bHex);
  const [left, right] = compareBytes(a, b) <= 0 ? [a, b] : [b, a];
  const preimage = concat(new Uint8Array([NODE_PREFIX]), left, right);
  return bytesToUnprefixedHex(keccakBytes(preimage));
}

export interface MerkleProof {
  fileHash: string;
  fileName: string;
  /** Leaf as it appears in the tree after domain-tagged hashing. */
  leafHash: string;
  /** Unsorted sibling path — verifier re-sorts at each step. */
  proofPath: string[];
  rootHash: string;
  index: number;
  totalFiles: number;
}

export interface MerkleTree {
  root: string;
  proofs: MerkleProof[];
  leaves: string[];
}

export async function buildMerkleTree(
  files: { hash: string; fileName: string }[]
): Promise<MerkleTree> {
  if (files.length === 0) throw new Error('Cannot build tree from empty array');

  const leaves = files.map((f) => hashLeaf(f.hash));

  if (files.length === 1) {
    return {
      root: leaves[0],
      proofs: [
        {
          fileHash: files[0].hash,
          fileName: files[0].fileName,
          leafHash: leaves[0],
          proofPath: [],
          rootHash: leaves[0],
          index: 0,
          totalFiles: 1,
        },
      ],
      leaves,
    };
  }

  const tree: string[][] = [leaves];
  while (tree[tree.length - 1].length > 1) {
    const current = tree[tree.length - 1];
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 >= current.length) {
        // Promote unpaired leaf — no duplicate-leaf forgery risk.
        next.push(current[i]);
      } else {
        next.push(hashInternalPair(current[i], current[i + 1]));
      }
    }
    tree.push(next);
  }

  const root = tree[tree.length - 1][0];
  const proofs: MerkleProof[] = [];

  for (let i = 0; i < files.length; i++) {
    const path: string[] = [];
    let index = i;
    for (let level = 0; level < tree.length - 1; level++) {
      const levelNodes = tree[level];
      const isLeft = index % 2 === 0;
      const siblingIndex = isLeft ? index + 1 : index - 1;
      if (siblingIndex < levelNodes.length) {
        path.push(levelNodes[siblingIndex]);
      }
      index = Math.floor(index / 2);
    }
    proofs.push({
      fileHash: files[i].hash,
      fileName: files[i].fileName,
      leafHash: leaves[i],
      proofPath: path,
      rootHash: root,
      index: i,
      totalFiles: files.length,
    });
  }

  return { root, proofs, leaves };
}

export async function verifyMerkleProof(proof: MerkleProof): Promise<boolean> {
  let current = proof.leafHash;
  for (const sibling of proof.proofPath) {
    current = hashInternalPair(current, sibling);
  }
  return current === proof.rootHash;
}

/** Shape of the JSON a user downloads after a batch certification. */
export interface BatchProofBundle {
  schema: 'origynl.batch-proofs.v1';
  rootHash: string;
  txHash: string | null;
  blockHeight?: number;
  timestamp?: number;
  signer?: string;
  chain?: { name?: string; id?: number };
  note?: string;
  proofs: MerkleProof[];
}

export interface BundleParseResult {
  ok: true;
  bundle: BatchProofBundle;
}
export interface BundleParseError {
  ok: false;
  error: string;
}

export function parseBundle(raw: unknown): BundleParseResult | BundleParseError {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, error: 'Not a JSON object' };
  }
  const b = raw as Record<string, unknown>;
  if (b.schema !== 'origynl.batch-proofs.v1') {
    return { ok: false, error: `Unsupported schema: ${String(b.schema)}` };
  }
  if (typeof b.rootHash !== 'string' || !/^[a-f0-9]{64}$/i.test(b.rootHash)) {
    return { ok: false, error: 'rootHash missing or malformed' };
  }
  if (!Array.isArray(b.proofs) || b.proofs.length === 0) {
    return { ok: false, error: 'proofs[] missing or empty' };
  }
  for (const p of b.proofs as unknown[]) {
    if (p === null || typeof p !== 'object') {
      return { ok: false, error: 'A proof entry is not an object' };
    }
    const pp = p as Record<string, unknown>;
    if (typeof pp.fileHash !== 'string' || !/^[a-f0-9]{64}$/i.test(pp.fileHash)) {
      return { ok: false, error: 'proof.fileHash malformed' };
    }
    if (typeof pp.leafHash !== 'string' || !/^[a-f0-9]{64}$/i.test(pp.leafHash)) {
      return { ok: false, error: 'proof.leafHash malformed' };
    }
    if (!Array.isArray(pp.proofPath)) {
      return { ok: false, error: 'proof.proofPath must be an array' };
    }
    for (const sibling of pp.proofPath as unknown[]) {
      if (typeof sibling !== 'string' || !/^[a-f0-9]{64}$/i.test(sibling)) {
        return { ok: false, error: 'proof.proofPath contains malformed hash' };
      }
    }
  }
  return { ok: true, bundle: raw as BatchProofBundle };
}

export type BundleVerdict =
  | { status: 'match'; proof: MerkleProof }
  | { status: 'no_member'; fileHash: string }
  | { status: 'tampered'; proof: MerkleProof }
  | { status: 'root_mismatch'; proof: MerkleProof };

/**
 * Given a bundle and a file's SHA-256, either return the verified matching
 * proof or explain why the file is not a member of this batch.
 */
export async function verifyFileAgainstBundle(
  fileHash: string,
  bundle: BatchProofBundle
): Promise<BundleVerdict> {
  const normalisedFile = fileHash.toLowerCase();
  const match = bundle.proofs.find((p) => p.fileHash.toLowerCase() === normalisedFile);
  if (!match) return { status: 'no_member', fileHash: normalisedFile };

  const expectedLeaf = hashLeaf(match.fileHash);
  if (expectedLeaf.toLowerCase() !== match.leafHash.toLowerCase()) {
    return { status: 'tampered', proof: match };
  }

  // Walk the path using the proof's declared root, then also compare against
  // the bundle's headline root so a tampered per-proof root can't pass.
  const proofValid = await verifyMerkleProof(match);
  if (!proofValid) return { status: 'tampered', proof: match };
  if (match.rootHash.toLowerCase() !== bundle.rootHash.toLowerCase()) {
    return { status: 'root_mismatch', proof: match };
  }
  return { status: 'match', proof: match };
}
