// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title OrigynlLedgerV2
 * @notice Immutable proof-of-existence ledger for file fingerprints.
 *
 * Improvements over v1:
 *   - `bytes32` storage instead of arbitrary `string` — ~70% gas savings.
 *   - Batch certification via Merkle roots (one tx covers N files).
 *   - EIP-712 signed attestations so a sponsor can pay gas on behalf of a
 *     user who signs off-chain, without custodying the user's key.
 *   - Role-gated pause + sponsor relay, no `Ownable` bottleneck.
 *   - Optional 64-bit perceptual-hash mapping for similarity lookup.
 */
contract OrigynlLedgerV2 is AccessControl, Pausable, EIP712 {
    bytes32 public constant SPONSOR_ROLE = keccak256("SPONSOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint32 public constant FLAG_LIVE_CAPTURE = 1 << 0;
    uint32 public constant FLAG_BATCH_ROOT = 1 << 1;
    uint32 public constant FLAG_C2PA = 1 << 2;

    struct Record {
        uint64 blockTs;
        address signer;
        uint32 flags;
    }

    mapping(bytes32 leaf => Record) public records;
    mapping(bytes32 leaf => bytes8) public phashOf;
    mapping(bytes32 root => uint32 leafCount) public batches;
    mapping(address user => uint256) public nonces;

    bytes32 private constant _CERTIFY_TYPEHASH =
        keccak256("Certify(bytes32 leaf,uint32 flags,uint256 deadline,uint256 nonce)");

    event Certified(
        bytes32 indexed leaf,
        address indexed signer,
        uint64 blockTs,
        uint32 flags
    );
    event BatchCertified(
        bytes32 indexed root,
        address indexed signer,
        uint64 blockTs,
        uint32 leafCount,
        uint32 flags
    );
    event AttestedBy(bytes32 indexed leaf, address indexed attester);
    event PerceptualHashSet(bytes32 indexed leaf, bytes8 phash);

    error AlreadyCertified();
    error LeafNotCertified();
    error InvalidSignature();
    error Expired();
    error ZeroLeafCount();

    constructor(address admin) EIP712("Origynl", "2") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SPONSOR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // -------------------------------------------------------------------
    // Write path
    // -------------------------------------------------------------------

    /// @notice Self-custodial certification. Caller pays gas and is recorded.
    function certify(bytes32 leaf, uint32 flags) external whenNotPaused {
        _certify(leaf, msg.sender, flags & ~FLAG_BATCH_ROOT);
    }

    /// @notice Sponsor relay path. Any SPONSOR_ROLE holder can submit a
    /// user-signed certification. The user's EOA is the `signer` stored on
    /// chain — the sponsor only pays gas.
    function certifyWithSig(
        bytes32 leaf,
        uint32 flags,
        address user,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused onlyRole(SPONSOR_ROLE) {
        if (block.timestamp > deadline) revert Expired();
        uint256 nonce = nonces[user]++;
        bytes32 structHash = keccak256(
            abi.encode(_CERTIFY_TYPEHASH, leaf, flags, deadline, nonce)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        if (recovered != user) revert InvalidSignature();
        _certify(leaf, user, flags & ~FLAG_BATCH_ROOT);
    }

    /// @notice Commit a Merkle root covering `leafCount` file hashes. Any
    /// individual file can later prove membership via `verifyInBatch`.
    function certifyBatch(
        bytes32 root,
        uint32 leafCount,
        uint32 flags
    ) external whenNotPaused {
        if (leafCount == 0) revert ZeroLeafCount();
        if (records[root].blockTs != 0) revert AlreadyCertified();
        uint32 merged = flags | FLAG_BATCH_ROOT;
        records[root] = Record({
            blockTs: uint64(block.timestamp),
            signer: msg.sender,
            flags: merged
        });
        batches[root] = leafCount;
        emit Certified(root, msg.sender, uint64(block.timestamp), merged);
        emit BatchCertified(root, msg.sender, uint64(block.timestamp), leafCount, merged);
    }

    /// @notice Attach a 64-bit perceptual hash to an already-certified leaf.
    /// Only the original signer can set it (once).
    function setPerceptualHash(bytes32 leaf, bytes8 phash) external whenNotPaused {
        Record memory rec = records[leaf];
        if (rec.blockTs == 0) revert LeafNotCertified();
        if (rec.signer != msg.sender) revert InvalidSignature();
        if (phashOf[leaf] != bytes8(0)) revert AlreadyCertified();
        phashOf[leaf] = phash;
        emit PerceptualHashSet(leaf, phash);
    }

    /// @notice Anyone can co-sign (attest to) an existing record. Emits an
    /// event only — on-chain storage stays unchanged.
    function attest(bytes32 leaf) external whenNotPaused {
        if (records[leaf].blockTs == 0) revert LeafNotCertified();
        emit AttestedBy(leaf, msg.sender);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // -------------------------------------------------------------------
    // Read path
    // -------------------------------------------------------------------

    function verify(bytes32 leaf) external view returns (Record memory) {
        return records[leaf];
    }

    function verifyInBatch(
        bytes32 root,
        bytes32 leafHash,
        bytes32[] calldata proof
    ) external view returns (bool) {
        if (records[root].blockTs == 0) return false;
        return MerkleProof.verifyCalldata(proof, root, leafHash);
    }

    // -------------------------------------------------------------------
    // Internals
    // -------------------------------------------------------------------

    function _certify(bytes32 leaf, address signer, uint32 flags) internal {
        if (records[leaf].blockTs != 0) revert AlreadyCertified();
        records[leaf] = Record({
            blockTs: uint64(block.timestamp),
            signer: signer,
            flags: flags
        });
        emit Certified(leaf, signer, uint64(block.timestamp), flags);
    }
}
