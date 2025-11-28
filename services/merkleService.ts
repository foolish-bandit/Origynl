/**
 * Merkle Tree Service
 * 
 * Creates a tree structure from file hashes that lets us:
 * 1. Write ONE hash to the blockchain (the root)
 * 2. Prove ANY individual file was part of that batch
 * 
 * Think of it like a tournament bracket - pairs compete until there's one winner.
 * The "winner" (root) represents the entire tournament (all files).
 */

// Hash two strings together using SHA-256
async function hashPair(a: string, b: string): Promise<string> {
  // Always sort to ensure consistent ordering
  const combined = a < b ? a + b : b + a;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface MerkleProof {
  fileHash: string;
  fileName: string;
  proofPath: { hash: string; position: 'left' | 'right' }[];
  rootHash: string;
  index: number;
  totalFiles: number;
}

export interface MerkleTree {
  root: string;
  proofs: MerkleProof[];
  leaves: string[];
}

/**
 * Build a Merkle tree from an array of file hashes
 */
export async function buildMerkleTree(
  files: { hash: string; fileName: string }[]
): Promise<MerkleTree> {
  if (files.length === 0) {
    throw new Error('Cannot build tree from empty array');
  }

  // Special case: single file
  if (files.length === 1) {
    return {
      root: files[0].hash,
      proofs: [{
        fileHash: files[0].hash,
        fileName: files[0].fileName,
        proofPath: [],
        rootHash: files[0].hash,
        index: 0,
        totalFiles: 1
      }],
      leaves: [files[0].hash]
    };
  }

  const leaves = files.map(f => f.hash);
  
  // If odd number of leaves, duplicate the last one
  const paddedLeaves = [...leaves];
  if (paddedLeaves.length % 2 !== 0) {
    paddedLeaves.push(paddedLeaves[paddedLeaves.length - 1]);
  }

  // Build the tree level by level, tracking paths for proofs
  const tree: string[][] = [paddedLeaves];
  
  while (tree[tree.length - 1].length > 1) {
    const currentLevel = tree[tree.length - 1];
    const nextLevel: string[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || left;
      const parent = await hashPair(left, right);
      nextLevel.push(parent);
    }
    
    tree.push(nextLevel);
  }

  const root = tree[tree.length - 1][0];

  // Generate proof for each original file
  const proofs: MerkleProof[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const proofPath: { hash: string; position: 'left' | 'right' }[] = [];
    let index = i;
    
    for (let level = 0; level < tree.length - 1; level++) {
      const currentLevel = tree[level];
      const isLeftNode = index % 2 === 0;
      const siblingIndex = isLeftNode ? index + 1 : index - 1;
      
      if (siblingIndex < currentLevel.length) {
        proofPath.push({
          hash: currentLevel[siblingIndex],
          position: isLeftNode ? 'right' : 'left'
        });
      }
      
      index = Math.floor(index / 2);
    }
    
    proofs.push({
      fileHash: files[i].hash,
      fileName: files[i].fileName,
      proofPath,
      rootHash: root,
      index: i,
      totalFiles: files.length
    });
  }

  return { root, proofs, leaves };
}

/**
 * Verify a file's proof against a root hash
 */
export async function verifyMerkleProof(proof: MerkleProof): Promise<boolean> {
  let currentHash = proof.fileHash;
  
  for (const step of proof.proofPath) {
    if (step.position === 'left') {
      currentHash = await hashPair(step.hash, currentHash);
    } else {
      currentHash = await hashPair(currentHash, step.hash);
    }
  }
  
  return currentHash === proof.rootHash;
}
