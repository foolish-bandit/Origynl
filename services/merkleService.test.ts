import { describe, it, expect } from 'vitest';
import {
  buildMerkleTree,
  hashInternalPair,
  hashLeaf,
  verifyMerkleProof,
  parseBundle,
  verifyFileAgainstBundle,
  type BatchProofBundle,
  type MerkleProof,
} from './merkleService';

const FILES = [
  { hash: 'aa'.repeat(32), fileName: 'a.txt' },
  { hash: 'bb'.repeat(32), fileName: 'b.txt' },
  { hash: 'cc'.repeat(32), fileName: 'c.txt' },
  { hash: 'dd'.repeat(32), fileName: 'd.txt' },
  { hash: 'ee'.repeat(32), fileName: 'e.txt' },
];

describe('merkleService', () => {
  it('produces a deterministic root for the same input', async () => {
    const a = await buildMerkleTree(FILES);
    const b = await buildMerkleTree(FILES);
    expect(a.root).toEqual(b.root);
  });

  it('every proof verifies against the root', async () => {
    const tree = await buildMerkleTree(FILES);
    for (const proof of tree.proofs) {
      expect(await verifyMerkleProof(proof)).toBe(true);
    }
  });

  it('rejects a tampered file hash', async () => {
    const tree = await buildMerkleTree(FILES);
    const bad: MerkleProof = { ...tree.proofs[0], leafHash: hashLeaf('ff'.repeat(32)) };
    expect(await verifyMerkleProof(bad)).toBe(false);
  });

  it('rejects a tampered sibling path', async () => {
    const tree = await buildMerkleTree(FILES);
    const original = tree.proofs[2];
    if (original.proofPath.length === 0) throw new Error('fixture must have siblings');
    const tampered: MerkleProof = {
      ...original,
      proofPath: [...original.proofPath.slice(0, -1), 'ff'.repeat(32)],
    };
    expect(await verifyMerkleProof(tampered)).toBe(false);
  });

  it('handles the single-file trivial case', async () => {
    const tree = await buildMerkleTree([FILES[0]]);
    expect(tree.proofs[0].proofPath).toHaveLength(0);
    expect(tree.root).toEqual(tree.proofs[0].leafHash);
    expect(await verifyMerkleProof(tree.proofs[0])).toBe(true);
  });

  it('defeats a second-preimage attack via domain separation', async () => {
    // An attacker who knows two sibling leaves tries to pass the
    // concatenation of (leaf1 || leaf2) as a single forged leaf that equals
    // the parent node. Because our leaves are tagged with 0x00 and internal
    // nodes with 0x01 before hashing, the attacker's forged preimage never
    // produces a collision, and the verifier walks the path to a different
    // root.
    const tree = await buildMerkleTree(FILES);
    const leafA = tree.proofs[0].leafHash;
    const leafB = tree.proofs[1].leafHash;
    const parent = hashInternalPair(leafA, leafB);

    const forgery: MerkleProof = {
      ...tree.proofs[0],
      leafHash: parent,
      proofPath: tree.proofs[0].proofPath.slice(1),
    };
    expect(await verifyMerkleProof(forgery)).toBe(false);
  });

  it('does not duplicate odd leaves (promotes them)', async () => {
    const oddTree = await buildMerkleTree(FILES);
    expect(oddTree.leaves).toHaveLength(FILES.length);
    for (const proof of oddTree.proofs) {
      expect(await verifyMerkleProof(proof)).toBe(true);
    }
  });

  it('throws on empty input', async () => {
    await expect(buildMerkleTree([])).rejects.toThrow();
  });
});

describe('BatchProofBundle parsing + verification', () => {
  async function makeBundle(files = FILES): Promise<BatchProofBundle> {
    const tree = await buildMerkleTree(files);
    return {
      schema: 'origynl.batch-proofs.v1',
      rootHash: tree.root,
      txHash: null,
      proofs: tree.proofs,
    };
  }

  it('accepts a well-formed bundle', async () => {
    const bundle = await makeBundle();
    const parsed = parseBundle(bundle);
    expect(parsed.ok).toBe(true);
  });

  it('rejects wrong schema', () => {
    const parsed = parseBundle({ schema: 'other.v1', rootHash: 'aa'.repeat(32), proofs: [] });
    expect(parsed.ok).toBe(false);
  });

  it('rejects malformed proof hashes', async () => {
    const bundle = await makeBundle();
    const bad = { ...bundle, proofs: [{ ...bundle.proofs[0], fileHash: 'not-hex' }] };
    const parsed = parseBundle(bad);
    expect(parsed.ok).toBe(false);
  });

  it('verifies a matching file + bundle', async () => {
    const bundle = await makeBundle();
    const verdict = await verifyFileAgainstBundle(FILES[2].hash, bundle);
    expect(verdict.status).toBe('match');
  });

  it('reports no_member when the file hash is not listed', async () => {
    const bundle = await makeBundle();
    const verdict = await verifyFileAgainstBundle('11'.repeat(32), bundle);
    expect(verdict.status).toBe('no_member');
  });

  it('reports tampered when a proof path is forged', async () => {
    const bundle = await makeBundle();
    const tampered: BatchProofBundle = {
      ...bundle,
      proofs: bundle.proofs.map((p, i) =>
        i === 0 ? { ...p, proofPath: [...p.proofPath.slice(0, -1), 'ff'.repeat(32)] } : p
      ),
    };
    const verdict = await verifyFileAgainstBundle(FILES[0].hash, tampered);
    expect(verdict.status).toBe('tampered');
  });

  it('reports root_mismatch when the bundle headline root differs from per-proof root', async () => {
    const bundle = await makeBundle();
    const forged: BatchProofBundle = { ...bundle, rootHash: 'ab'.repeat(32) };
    const verdict = await verifyFileAgainstBundle(FILES[0].hash, forged);
    expect(verdict.status).toBe('root_mismatch');
  });
});
