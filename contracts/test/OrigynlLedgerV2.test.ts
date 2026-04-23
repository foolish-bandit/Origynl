import { expect } from 'chai';
import { ethers } from 'hardhat';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

const ZERO_HASH = '0x' + '00'.repeat(32);

describe('OrigynlLedgerV2', () => {
  async function deploy() {
    const [admin, user, sponsor, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('OrigynlLedgerV2');
    const ledger = await Factory.deploy(admin.address);
    await ledger.waitForDeployment();

    const sponsorRole = await ledger.SPONSOR_ROLE();
    await ledger.connect(admin).grantRole(sponsorRole, sponsor.address);

    return { ledger, admin, user, sponsor, attacker };
  }

  it('certifies a leaf once and rejects duplicates', async () => {
    const { ledger, user } = await deploy();
    const leaf = ethers.keccak256(ethers.toUtf8Bytes('file-A'));
    await expect(ledger.connect(user).certify(leaf, 0))
      .to.emit(ledger, 'Certified')
      .withArgs(leaf, user.address, anyUint64(), 0);
    await expect(ledger.connect(user).certify(leaf, 0)).to.be.revertedWithCustomError(
      ledger,
      'AlreadyCertified'
    );
  });

  it('stores block timestamp and signer exactly', async () => {
    const { ledger, user } = await deploy();
    const leaf = ethers.keccak256(ethers.toUtf8Bytes('file-B'));
    const tx = await ledger.connect(user).certify(leaf, 1);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt!.blockNumber);
    const rec = await ledger.records(leaf);
    expect(rec.signer).to.equal(user.address);
    expect(rec.blockTs).to.equal(BigInt(block!.timestamp));
    expect(rec.flags).to.equal(1n);
  });

  it('pauses and blocks writes while paused', async () => {
    const { ledger, admin, user } = await deploy();
    await ledger.connect(admin).pause();
    const leaf = ethers.keccak256(ethers.toUtf8Bytes('file-P'));
    await expect(ledger.connect(user).certify(leaf, 0)).to.be.revertedWithCustomError(
      ledger,
      'EnforcedPause'
    );
    await ledger.connect(admin).unpause();
    await expect(ledger.connect(user).certify(leaf, 0)).to.emit(ledger, 'Certified');
  });

  it('rejects pause from non-PAUSER', async () => {
    const { ledger, attacker } = await deploy();
    await expect(ledger.connect(attacker).pause()).to.be.revertedWithCustomError(
      ledger,
      'AccessControlUnauthorizedAccount'
    );
  });

  describe('certifyWithSig (EIP-712 sponsor relay)', () => {
    it('credits the user as signer when sponsor relays', async () => {
      const { ledger, user, sponsor } = await deploy();
      const leaf = ethers.keccak256(ethers.toUtf8Bytes('signed-file'));
      const flags = 1;
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const nonce = await ledger.nonces(user.address);

      const net = await ethers.provider.getNetwork();
      const domain = {
        name: 'Origynl',
        version: '2',
        chainId: net.chainId,
        verifyingContract: await ledger.getAddress(),
      };
      const types = {
        Certify: [
          { name: 'leaf', type: 'bytes32' },
          { name: 'flags', type: 'uint32' },
          { name: 'deadline', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
        ],
      };
      const sig = await user.signTypedData(domain, types, { leaf, flags, deadline, nonce });

      await expect(
        ledger.connect(sponsor).certifyWithSig(leaf, flags, user.address, deadline, sig)
      )
        .to.emit(ledger, 'Certified')
        .withArgs(leaf, user.address, anyUint64(), flags);

      const rec = await ledger.records(leaf);
      expect(rec.signer).to.equal(user.address);
      expect(await ledger.nonces(user.address)).to.equal(nonce + 1n);
    });

    it('rejects replay of a signature', async () => {
      const { ledger, user, sponsor } = await deploy();
      const leaf = ethers.keccak256(ethers.toUtf8Bytes('replay-leaf'));
      const flags = 0;
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const nonce = await ledger.nonces(user.address);
      const net = await ethers.provider.getNetwork();
      const domain = {
        name: 'Origynl',
        version: '2',
        chainId: net.chainId,
        verifyingContract: await ledger.getAddress(),
      };
      const types = {
        Certify: [
          { name: 'leaf', type: 'bytes32' },
          { name: 'flags', type: 'uint32' },
          { name: 'deadline', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
        ],
      };
      const sig = await user.signTypedData(domain, types, { leaf, flags, deadline, nonce });

      await ledger.connect(sponsor).certifyWithSig(leaf, flags, user.address, deadline, sig);

      // Replay with the same signature uses the *new* nonce -> fails signature check.
      await expect(
        ledger.connect(sponsor).certifyWithSig(leaf, flags, user.address, deadline, sig)
      ).to.be.revertedWithCustomError(ledger, 'InvalidSignature');
    });

    it('rejects expired signatures', async () => {
      const { ledger, user, sponsor } = await deploy();
      const leaf = ethers.keccak256(ethers.toUtf8Bytes('expired-leaf'));
      const deadline = Math.floor(Date.now() / 1000) - 1;
      const nonce = await ledger.nonces(user.address);
      const net = await ethers.provider.getNetwork();
      const domain = {
        name: 'Origynl',
        version: '2',
        chainId: net.chainId,
        verifyingContract: await ledger.getAddress(),
      };
      const types = {
        Certify: [
          { name: 'leaf', type: 'bytes32' },
          { name: 'flags', type: 'uint32' },
          { name: 'deadline', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
        ],
      };
      const sig = await user.signTypedData(domain, types, { leaf, flags: 0, deadline, nonce });
      await expect(
        ledger.connect(sponsor).certifyWithSig(leaf, 0, user.address, deadline, sig)
      ).to.be.revertedWithCustomError(ledger, 'Expired');
    });

    it('rejects relay from non-SPONSOR', async () => {
      const { ledger, user, attacker } = await deploy();
      const leaf = ethers.keccak256(ethers.toUtf8Bytes('noaccess-leaf'));
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const nonce = await ledger.nonces(user.address);
      const net = await ethers.provider.getNetwork();
      const domain = {
        name: 'Origynl',
        version: '2',
        chainId: net.chainId,
        verifyingContract: await ledger.getAddress(),
      };
      const types = {
        Certify: [
          { name: 'leaf', type: 'bytes32' },
          { name: 'flags', type: 'uint32' },
          { name: 'deadline', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
        ],
      };
      const sig = await user.signTypedData(domain, types, { leaf, flags: 0, deadline, nonce });
      await expect(
        ledger.connect(attacker).certifyWithSig(leaf, 0, user.address, deadline, sig)
      ).to.be.revertedWithCustomError(ledger, 'AccessControlUnauthorizedAccount');
    });
  });

  describe('certifyBatch + verifyInBatch', () => {
    it('commits a root and proves member files', async () => {
      const { ledger, user } = await deploy();
      const fileBytes = ['a', 'b', 'c', 'd'].map((s) =>
        ethers.keccak256(ethers.toUtf8Bytes(s))
      );
      const values = fileBytes.map((h) => [h]);
      const tree = StandardMerkleTree.of(values, ['bytes32']);
      const root = tree.root as `0x${string}`;

      await expect(ledger.connect(user).certifyBatch(root, values.length, 0))
        .to.emit(ledger, 'BatchCertified')
        .withArgs(root, user.address, anyUint64(), values.length, anyFlags());

      for (let i = 0; i < values.length; i++) {
        const proof = tree.getProof(i);
        const leafHash = ethers.keccak256(
          ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(['bytes32'], [values[i][0]]))
        );
        expect(await ledger.verifyInBatch(root, leafHash, proof)).to.equal(true);
      }
    });

    it('rejects empty batches and duplicate roots', async () => {
      const { ledger, user } = await deploy();
      const root = ethers.keccak256(ethers.toUtf8Bytes('root-A')) as `0x${string}`;
      await expect(ledger.connect(user).certifyBatch(root, 0, 0)).to.be.revertedWithCustomError(
        ledger,
        'ZeroLeafCount'
      );
      await ledger.connect(user).certifyBatch(root, 2, 0);
      await expect(ledger.connect(user).certifyBatch(root, 2, 0)).to.be.revertedWithCustomError(
        ledger,
        'AlreadyCertified'
      );
    });

    it('returns false for leaves not in a known batch', async () => {
      const { ledger } = await deploy();
      const unknownRoot = ethers.keccak256(ethers.toUtf8Bytes('never-committed')) as `0x${string}`;
      expect(await ledger.verifyInBatch(unknownRoot, ZERO_HASH, [])).to.equal(false);
    });
  });

  describe('perceptual hash mapping', () => {
    it('lets the original signer set phash once', async () => {
      const { ledger, user } = await deploy();
      const leaf = ethers.keccak256(ethers.toUtf8Bytes('phash-leaf'));
      await ledger.connect(user).certify(leaf, 0);
      const phash = '0x0123456789abcdef';
      await expect(ledger.connect(user).setPerceptualHash(leaf, phash))
        .to.emit(ledger, 'PerceptualHashSet')
        .withArgs(leaf, phash);
      expect(await ledger.phashOf(leaf)).to.equal(phash);

      await expect(
        ledger.connect(user).setPerceptualHash(leaf, '0xfedcba9876543210')
      ).to.be.revertedWithCustomError(ledger, 'AlreadyCertified');
    });

    it('rejects phash from non-signer', async () => {
      const { ledger, user, attacker } = await deploy();
      const leaf = ethers.keccak256(ethers.toUtf8Bytes('phash-leaf-2'));
      await ledger.connect(user).certify(leaf, 0);
      await expect(
        ledger.connect(attacker).setPerceptualHash(leaf, '0x0000000000000001')
      ).to.be.revertedWithCustomError(ledger, 'InvalidSignature');
    });

    it('rejects phash for uncertified leaves', async () => {
      const { ledger, user } = await deploy();
      const leaf = ethers.keccak256(ethers.toUtf8Bytes('never-certified'));
      await expect(
        ledger.connect(user).setPerceptualHash(leaf, '0x0000000000000001')
      ).to.be.revertedWithCustomError(ledger, 'LeafNotCertified');
    });
  });
});

function anyUint64() {
  return (v: bigint | number) => typeof v === 'bigint' || typeof v === 'number';
}
function anyFlags() {
  return (v: bigint | number) => typeof v === 'bigint' || typeof v === 'number';
}
