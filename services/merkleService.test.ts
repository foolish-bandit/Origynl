import { describe, it, expect } from 'vitest';
import {
  buildMerkleTree,
  hashInternalPair,
  hashLeaf,
  verifyMerkleProof,
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
