# Scaffold-HBAR bounty evidence

Repository: https://github.com/williamleewilliam1-star/hedera-agent-receipt-ledger

This file records reproducible evidence for the Scaffold-HBAR Template Bounty eligibility gate. It intentionally separates completed checks from the one remaining testnet-write proof.

## Mechanical gate

| Requirement | Status | Evidence |
| --- | --- | --- |
| Public GitHub repository | PASS | Repository URL above |
| External template scaffolds through official CLI | PASS | Fresh scaffold completed from `--template williamleewilliam1-star/hedera-agent-receipt-ledger` |
| `template.json` present | PASS | Root manifest, npm + Next.js + Hardhat |
| `README.md` and `AGENTS.md` present | PASS | Root documentation |
| Clean dependency install | PASS | Official CLI completed npm install without manual repair |
| Lint | PASS | Next.js + Hardhat lint, zero warnings/errors |
| Solidity compile | PASS | Solidity 0.8.28, one product contract |
| Contract tests | PASS | AgentReceiptRegistry 2/2 passing |
| Next.js typecheck | PASS | `tsc --noEmit` |
| Production build | PASS | Next.js production build completed |
| App boots | PASS | Production server started successfully |
| Core read routes | PASS | Home/status/preview HTTP 200 |
| No committed `.env` or user secrets | PASS | pre-publication tracked-file/pattern scan |
| MIT licence | PASS | repository licence |
| Verifiable Hedera testnet write | PENDING | Requires one explicit operator-signed testnet transaction |
## Fresh-scaffold reproduction

The validation was repeated in a new directory populated by the official CLI, not in the authoring worktree:

```bash
npm create scaffold-hbar@latest \
  --template williamleewilliam1-star/hedera-agent-receipt-ledger \
  --frontend nextjs-app \
  --solidity-framework hardhat \
  --network testnet \
  --package-manager npm \
  --skip-hedera-skills \
  --yes
```

Inside that generated project:

```bash
npm run lint
npm run hardhat:compile
npm run hardhat:test
npm run next:check-types
npm run next:build
git diff --check
```

The generated repository stayed clean after the checks.
## HTTP smoke evidence

A production build was served on a temporary local port with no Hedera credentials configured.

Observed behavior:

- `/` -> HTTP 200.
- `/api/receipts/status` -> HTTP 200 and explicit read-only mode.
- `/api/receipts/preview` -> HTTP 200.
- Equivalent JSON objects with reordered keys produced identical artifact and HCS-message digests.
- `/api/receipts/topic` -> HTTP 503 without operator credentials.
- `/api/receipts/submit` -> HTTP 503 without operator credentials.
- `/api/receipts/verify` -> HTTP 400 when required proof coordinates are missing.

These write failures are deliberate safety guards, not missing route implementations.

## Hedera integration under test

The load-bearing path is:

```text
artifact
  -> canonical JSON
  -> SHA-256 artifact digest
  -> compact HCS receipt envelope
  -> Hedera Consensus Service
  -> public Mirror Node verification
  -> optional AgentReceiptRegistry anchor on Hedera EVM
```
The template uses `@hiero-ledger/sdk` for HCS topic creation/submission and the Hedera-hosted Mirror Node REST API for independent message retrieval. The optional Solidity registry binds the artifact digest and HCS sequence to a provider-controlled offer.

## Remaining evidence step

Before bounty submission, perform one explicitly authorized Hedera **testnet** write using a funded testnet operator, then record:

- transaction ID;
- HCS topic ID;
- HCS sequence number;
- Hashscan link and/or Mirror Node URL;
- decoded receipt envelope;
- recomputed message digest.

Do not replace this evidence with a mocked transaction or a local Hardhat transaction.

## Continuous validation

GitHub Actions workflow `.github/workflows/lint.yaml` runs the Template Gate on pushes and pull requests:

- `npm ci`;
- lint;
- Solidity compile;
- contract tests;
- Next.js typecheck;
- production build;
- clean tracked-tree check.

## Fresh pre-submission validation — 2026-10-01 UTC

The full local gate was rerun from the public repository before submission work:

```bash
npm ci --legacy-peer-deps --no-audit --no-fund
npm run lint
npm run hardhat:compile
npm run hardhat:test
npm run next:check-types
npm run next:build
git diff --check
```

Observed results:

- dependency install: PASS (`1656` packages installed);
- Next.js + Hardhat lint: PASS, zero ESLint warnings/errors;
- Solidity `0.8.28` compile: PASS;
- `AgentReceiptRegistry` tests: **2/2 PASS** on Hedera fork;
- Next.js TypeScript check: PASS;
- Next.js `15.5.26` production build: PASS, 14 static pages generated;
- `git diff --check`: PASS.

This refresh changes no product behavior and does not substitute for the outstanding Hedera testnet HCS proof. The only eligibility item still marked PENDING is the explicitly authorized real testnet write described above.

## One-command HCS proof helper

`packages/nextjs/scripts/hcs-bounty-proof.mjs` now packages the remaining testnet evidence step without printing or persisting the operator private key. It:

1. builds the same canonical receipt-envelope shape used by the app;
2. creates a fresh HCS topic;
3. submits the receipt message;
4. waits for the matching Mirror Node sequence to appear;
5. prints only public proof material: topic ID, sequence, transaction ID, digests, Mirror URL and HashScan URLs.

Safe preflight:

```bash
npm run hcs:proof -w @sh/nextjs -- --dry-run
```

The 2026-10-01 dry run produced a 365-byte envelope and deterministic artifact, receipt and message SHA-256 digests. The live command remains intentionally blocked until real Hedera operator credentials are configured locally.

## Submission status — 2026-10-01

- Hedera mainnet payout account created in HashPack: `0.0.10898341`.
- Short public demo video: https://raw.githubusercontent.com/williamleewilliam1-star/hedera-agent-receipt-ledger/main/demo/hedera-demo.mp4
- Official Scaffold HBAR Template bounty Google Form returned **"Your response has been recorded"** on 2026-10-01.
- The public repository, demo video, and this evidence page were included in the submission.
- A separate locally generated ECDSA testnet operator is prepared for the final live HCS evidence; its private key is stored outside the repository and is not printed or committed.
- Final faucet disbursement is currently pending the official Hedera Portal reCAPTCHA; once funded, the one-command proof helper will create a topic, publish the receipt, and record Mirror Node/HashScan evidence here.
