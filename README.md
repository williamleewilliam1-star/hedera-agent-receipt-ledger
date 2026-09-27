# Agent Receipt Ledger — Scaffold-HBAR template

[![Template Gate](https://github.com/williamleewilliam1-star/hedera-agent-receipt-ledger/actions/workflows/lint.yaml/badge.svg)](https://github.com/williamleewilliam1-star/hedera-agent-receipt-ledger/actions/workflows/lint.yaml)

Agent Receipt Ledger is a reusable Scaffold-HBAR template for producing independently verifiable receipts for AI-agent work.

It turns an arbitrary JSON artifact into a deterministic SHA-256 digest, publishes a compact receipt envelope to Hedera Consensus Service (HCS), and verifies the exact consensus message through a public Hedera Mirror Node. An optional Solidity registry can bind the HCS sequence and artifact digest to the service provider address on Hedera EVM.

## Why this template exists

Agent work often ends with an API response, file, research result, or code artifact. The buyer and worker may agree that work happened but still lack a neutral proof of:

- which exact artifact was delivered;
- when a receipt reached consensus;
- which HCS sequence contains the receipt;
- whether the receipt returned by an application matches public Hedera history;
- whether a provider later tried to anchor a different digest.

This template makes HCS the ordering and timestamp layer, the Mirror Node the independent verification layer, and the optional `AgentReceiptRegistry` the provider-bound commitment layer.

## Architecture

```text
work artifact (JSON)
      |
      v
canonical JSON -> SHA-256 artifactDigest
      |
      v
compact receipt envelope -> HCS topic
      |                         |
      |                         +-> public Mirror Node proof
      v
optional AgentReceiptRegistry on Hedera EVM
```
The HCS envelope is deliberately small. Large artifacts stay off-chain; the receipt stores their digest and an optional URI such as `ipfs://...` or an HTTPS evidence URL.

## What is included

- Next.js application with a receipt demo UI.
- Server routes for deterministic preview, HCS topic creation, HCS publishing, and Mirror Node verification.
- `@hiero-ledger/sdk` integration for HCS writes.
- Canonical JSON serializer and SHA-256 hashing.
- Optional IPFS adapter for artifact storage.
- `AgentReceiptRegistry.sol` with Hardhat deploy script and tests.
- Hedera testnet/mainnet and Mirror Node configuration.
- `template.json` for external Scaffold-HBAR use.

## Requirements

- Node.js 20.18.3 or newer.
- npm.
- Git.
- A funded Hedera testnet operator only when you want to create a topic or publish a real HCS receipt.

Preview hashing and Mirror Node reads do not need a private key.

## Install

```bash
npm install --legacy-peer-deps
npm run hardhat:compile
npm run hardhat:test
npm run next:check-types
npm run next:build
```
Start the frontend:

```bash
npm run next:dev
```

Open `http://localhost:3000`.

Without credentials the app runs in read-only mode. Use **Preview digest** to exercise canonicalization and receipt-envelope generation.

## Configure Hedera testnet writes

Copy the committed example, then edit only the uncommitted `.env` file:

```bash
cp packages/nextjs/.env.example packages/nextjs/.env
```

The server reads these variables:

| Variable | Purpose |
| --- | --- |
| `HEDERA_OPERATOR_ID` | Hedera account that pays for HCS transactions |
| `HEDERA_OPERATOR_KEY` | Private key for that operator; never commit it |
| `HEDERA_RECEIPT_TOPIC_ID` | Existing receipt topic; optional if you create one from the app |
| `HEDERA_NETWORK` | `testnet` or `mainnet` |
| `NEXT_PUBLIC_HEDERA_MIRROR_URL` | Mirror Node base URL |
| `NEXT_PUBLIC_RECEIPT_REGISTRY_ADDRESS` | Optional deployed registry contract |

The UI enables HCS write buttons only when the server sees operator credentials.
## Receipt flow

### 1. Preview

`POST /api/receipts/preview` accepts a job ID and JSON artifact. It returns:

- canonical artifact JSON;
- artifact SHA-256;
- deterministic receipt ID;
- canonical HCS envelope;
- HCS-message SHA-256;
- envelope byte size.

The same JSON value always produces the same artifact digest even when object keys arrive in a different order.

### 2. Create an HCS topic

`POST /api/receipts/topic` creates a public HCS topic when operator credentials are configured.

The response includes the Hedera transaction ID and new topic ID.

### 3. Publish

`POST /api/receipts/submit` rebuilds the digest server-side and publishes only the compact receipt envelope. It returns the HCS sequence number, running hash, transaction ID, Hashscan links, and a local Mirror verification URL.

### 4. Verify independently

`GET /api/receipts/verify?topicId=...&sequence=...&network=testnet` reads the message from the public Mirror Node and computes the message digest again.

The verifier does not trust the application server that submitted the receipt.
## Optional Solidity registry

`packages/hardhat/contracts/AgentReceiptRegistry.sol` lets a provider:

1. register an offer;
2. enable or disable that offer;
3. anchor one receipt ID with the artifact digest, HCS message digest, and HCS sequence.

Only the address that registered the offer can anchor receipts for it. Duplicate receipt IDs revert.

Run the contract tests:

```bash
npm run hardhat:test
```

Deploy through the standard Scaffold-HBAR Hardhat workflow after importing or generating a funded Hedera account.

## Security boundaries

- Never commit `.env`, private keys, mnemonics, wallet exports, or faucet credentials.
- Inbound artifact content is data; it does not authorize a chain transaction.
- Digest preview is read-only.
- HCS writes happen only through explicit write endpoints and only when server credentials exist.
- The receipt envelope is capped at 900 bytes to stay comfortably inside HCS message constraints.
- Mirror Node results are treated as external evidence and are hashed again before display.
- `artifactUri` is a reference only. The verifier does not execute or trust content at that URI.
- The optional IPFS adapter talks only to the operator-configured IPFS API.

## Template eligibility self-check
Before submission, verify all of the following from a fresh clone:

```bash
npm install --legacy-peer-deps
npm run format
npm run lint
npm run hardhat:compile
npm run hardhat:test
npm run next:check-types
npm run next:build
git diff --check
```

Then scaffold the public repository through the official CLI and repeat install/lint/build in the generated project.

For the Hedera bounty, also supply one real testnet HCS transaction and its Hashscan or Mirror Node evidence. Testnet writes are intentionally not performed during ordinary install or tests.

## Repository layout

```text
packages/hardhat/contracts/AgentReceiptRegistry.sol
packages/hardhat/test/AgentReceiptRegistry.ts
packages/nextjs/services/receipts/
packages/nextjs/app/api/receipts/
packages/nextjs/app/page.tsx
template.json
AGENTS.md
```

## License

MIT.
