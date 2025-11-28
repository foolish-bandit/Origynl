# Origynl - Blockchain Document Authentication

Origynl is a web application that stamps documents and images with cryptographic proofs anchored to the Polygon blockchain. Each certified file receives a SHA-256 hash that is permanently recorded on-chain.

## Features

- **Certify**: Upload images/PDFs and anchor their hash to Polygon Amoy testnet
- **Verify**: Check if any document has been previously certified
- **Capture**: Use device camera for live witness proofs with sensor telemetry
- **Watermarking**: Certified images receive embedded visual + metadata proofs

## Tech Stack

- React 19 + Vite
- Vercel Serverless Functions (API routes)
- Polygon Amoy testnet (via viem)
- TailwindCSS

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/origynl.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Add Environment Variables:
   - `PRIVATE_KEY` - Your Polygon wallet private key (needs POL for gas)
   - `CONTRACT_ADDRESS` - `0x894C98bf09B4e9e4FEd3612803920b7d82C59d41`
5. Deploy!

### 3. Get Testnet POL

Your wallet needs POL on Amoy testnet to pay for gas:
- [Polygon Faucet](https://faucet.polygon.technology/)

## Local Development

```bash
npm install
npm run dev
```

Note: Certify functionality requires the Vercel serverless functions to be running, which only work when deployed to Vercel. Local dev will show the UI but blockchain writes will fail.

## Smart Contract

The OrigynlLedger contract is deployed at:
- **Amoy**: `0x894C98bf09B4e9e4FEd3612803920b7d82C59d41`

View on [PolygonScan](https://amoy.polygonscan.com/address/0x894C98bf09B4e9e4FEd3612803920b7d82C59d41)
