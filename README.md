<p align="center">
  <img src="./images/your-image.png" alt="Origynl banner" width="600" />
</p>

# Origynl

Blockchain-anchored document authentication. Upload a file, get an immutable proof.

Origynl stamps documents and images with SHA-256 cryptographic hashes recorded permanently on the Polygon blockchain. No middleman, no trust assumptions. The hash is the proof, and the chain is the receipt.

**Live:** [origynl-20.vercel.app](https://origynl-20.vercel.app)

## What It Does

**Certify** - Upload an image or PDF. Origynl computes a SHA-256 hash of the file and writes it to the OrigynlLedger smart contract on Polygon Amoy. The file itself never leaves your device; only the hash goes on-chain.

**Verify** - Drop in any document to check whether it has been previously certified. If the hash exists on-chain, you get the timestamp and transaction record. If it doesn't, the file is uncertified.

**Capture** - Use your device camera to take a live photo with embedded sensor telemetry (GPS, timestamp, device metadata via EXIF). This creates a "witness proof" that ties a moment in time to a blockchain-anchored hash.

**Watermark** - Certified images receive a visible watermark and embedded metadata proving their certification status, making tampering detectable at a glance.

## Why This Exists

AI-generated content is getting indistinguishable from the real thing. Origynl provides a cryptographic chain of custody for original work: if you can prove a hash was recorded on-chain before someone else claims authorship, the blockchain timestamp is your evidence. It's not DRM. It's a notary.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Tailwind CSS |
| Routing | React Router v7 |
| Build | Vite 6 |
| Blockchain | Polygon Amoy testnet via [viem](https://viem.sh) |
| Smart Contract | Solidity (`OrigynlLedger.sol`) |
| PDF Handling | pdf-lib |
| Camera/EXIF | react-webcam, piexifjs |
| Backend | Vercel Serverless Functions |
| Icons | Lucide React |

## Smart Contract

`OrigynlLedger` is deployed on Polygon Amoy at:
0x894C98bf09B4e9e4FEd3612803920b7d82C59d41

[View on PolygonScan](https://amoy.polygonscan.com/address/0x894C98bf09B4e9e4FEd3612803920b7d82C59d41)

See [`BLOCKCHAIN_INTEGRATION.md`](./BLOCKCHAIN_INTEGRATION.md) for contract architecture and integration details.

## Getting Started

### Prerequisites

- Node.js (v18+)
- A Polygon wallet with testnet POL ([faucet](https://faucet.polygon.technology/))

### Setup

```bash
git clone https://github.com/foolish-bandit/Origynl.git
cd Origynl
npm install
```

Create a `.env.local` file:

```env
PRIVATE_KEY=your_polygon_wallet_private_key
CONTRACT_ADDRESS=0x894C98bf09B4e9e4FEd3612803920b7d82C59d41
```

### Run

```bash
npm run dev
```

> **Note:** Certify (blockchain writes) requires Vercel serverless functions. Local dev will render the UI but on-chain transactions will fail. Deploy to Vercel for full functionality.

### Deploy to Vercel

1. Push to GitHub
2. Import into [Vercel](https://vercel.com)
3. Add `PRIVATE_KEY` and `CONTRACT_ADDRESS` as environment variables
4. Deploy

## Project Structure
├── App.tsx              # App shell + routing
├── OrigynlLedger.sol    # Solidity smart contract
├── api/                 # Vercel serverless functions (blockchain writes)
├── components/          # React UI components
├── pages/               # Route-level page components
├── services/            # Blockchain + hashing service layer
├── public/              # Static assets
├── types.ts             # TypeScript types
└── vercel.json          # Vercel config

## Roadmap

- [ ] Polygon mainnet deployment
- [ ] Batch certification (multiple files, single transaction)
- [ ] AI detection scoring alongside blockchain proof
- [ ] Public verification page (shareable proof URLs)
- [ ] IPFS pinning for certified file backup
- [ ] Mobile-native capture (Capacitor/native camera APIs)

## License

MIT

---

Built by [Zack Brenner](https://github.com/foolish-bandit)
