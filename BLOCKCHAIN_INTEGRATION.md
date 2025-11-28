# Origynl Blockchain Integration Guide

## 1. The Smart Contract (Solidity)

Deploy this contract to Polygon Amoy (Testnet) or Mainnet.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract OrigynlLedger {
    struct Record {
        uint256 timestamp;
        address sender;
        bool exists;
    }

    mapping(string => Record) public records;

    event FileCertified(string indexed hash, address indexed sender, uint256 timestamp);

    /**
     * @dev Saves a hash to the blockchain. 
     * Reverts if hash already exists to save gas and ensure immutability.
     */
    function certify(string calldata _hash) external {
        require(!records[_hash].exists, "Hash already registered");

        records[_hash] = Record({
            timestamp: block.timestamp,
            sender: msg.sender,
            exists: true
        });

        emit FileCertified(_hash, msg.sender, block.timestamp);
    }

    /**
     * @dev Verifies a hash. Returns (exists, timestamp, sender).
     */
    function verify(string calldata _hash) external view returns (bool, uint256, address) {
        Record memory r = records[_hash];
        return (r.exists, r.timestamp, r.sender);
    }
}
```

## 2. The Backend Relayer (Node.js)

You need a small backend API (Next.js API Route, Express, or Cloud Function) to hold your private key and pay for gas.

**Install Dependencies:**
`npm install viem dotenv`

**Code (`api/certify.ts`):**

```typescript
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';

// 1. Configuration
const ACCOUNT = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;
const ALCHEMY_URL = process.env.ALCHEMY_RPC_URL;

// 2. Setup Clients
const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(ALCHEMY_URL)
});

const walletClient = createWalletClient({
  account: ACCOUNT,
  chain: polygonAmoy,
  transport: http(ALCHEMY_URL)
});

// 3. Contract ABI (Interface)
const abi = parseAbi([
  'function certify(string calldata _hash) external',
  'function verify(string calldata _hash) external view returns (bool, uint256, address)'
]);

/**
 * WRITES to the chain (Costs Gas)
 */
export async function certifyHashOnChain(fileHash: string) {
  // Check if exists first to save gas
  const [exists] = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'verify',
    args: [fileHash]
  });

  if (exists) throw new Error("Document already certified");

  // Send Transaction
  const { request } = await publicClient.simulateContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'certify',
    args: [fileHash],
    account: ACCOUNT
  });

  const hash = await walletClient.writeContract(request);
  
  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  return {
    txHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber
  };
}

/**
 * READS from the chain (Free)
 */
export async function verifyHashOnChain(fileHash: string) {
  const [exists, timestamp, sender] = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'verify',
    args: [fileHash]
  });

  return { exists, timestamp: Number(timestamp), sender };
}
```

## 3. Environment Variables (.env)

```env
# Your Wallet's Private Key (Keep Secret!)
PRIVATE_KEY=0x...
# The deployed contract address
CONTRACT_ADDRESS=0x...
# API URL from Alchemy/Infura
ALCHEMY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/...
```
