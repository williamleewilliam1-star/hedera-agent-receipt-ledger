import { createHash } from "node:crypto";
import {
  AccountId,
  Client,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from "@hiero-ledger/sdk";

const network = (process.env.HEDERA_NETWORK || "testnet").trim();
if (!["testnet", "mainnet"].includes(network)) throw new Error("HEDERA_NETWORK must be testnet or mainnet");
const dryRun = process.argv.includes("--dry-run");

function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Receipt JSON cannot contain non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  return "{" + Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, child]) => JSON.stringify(key) + ":" + canonicalJson(child)).join(",") + "}";
}

const sha256Hex = input => createHash("sha256").update(input).digest("hex");
const artifact = {
  repository: "https://github.com/williamleewilliam1-star/hedera-agent-receipt-ledger",
  validation: "2026-10-01",
  template: "agent-receipt-ledger",
};
const jobId = "hedera-scaffold-hbar-template-bounty-2026";
const canonicalArtifact = canonicalJson(artifact);
const artifactDigest = sha256Hex(canonicalArtifact);
const receiptId = sha256Hex(canonicalJson({ artifactDigest, jobId }));
const envelope = {
  schema: "babydov.agent_receipt.v1",
  receiptId,
  jobId,
  artifactDigest,
  artifactUri: "https://github.com/williamleewilliam1-star/hedera-agent-receipt-ledger",
  provider: "Ivan Babydov",
};
const message = canonicalJson(envelope);
const messageDigest = sha256Hex(message);
const messageBytes = Buffer.byteLength(message);
if (messageBytes > 900) throw new Error(`HCS receipt envelope is ${messageBytes} bytes; max 900`);

const preview = { network, dryRun, artifactDigest, receiptId, messageDigest, messageBytes };
if (dryRun) {
  console.log(JSON.stringify(preview, null, 2));
  process.exit(0);
}
const accountId = process.env.HEDERA_OPERATOR_ID?.trim();
const privateKey = process.env.HEDERA_OPERATOR_KEY?.trim();
if (!accountId || !privateKey) {
  throw new Error("Set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY, or run with --dry-run");
}

const client = network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
client.setOperator(AccountId.fromString(accountId), PrivateKey.fromString(privateKey));
try {
  const topicResponse = await new TopicCreateTransaction()
    .setTopicMemo("Agent Receipt Ledger bounty proof")
    .execute(client);
  const topicReceipt = await topicResponse.getReceipt(client);
  if (!topicReceipt.topicId) throw new Error("Topic creation returned no topicId");
  const topicId = topicReceipt.topicId.toString();

  const submitResponse = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)
    .execute(client);
  const submitReceipt = await submitResponse.getReceipt(client);
  if (submitReceipt.topicSequenceNumber == null) throw new Error("Message receipt returned no sequence number");

  const sequenceNumber = submitReceipt.topicSequenceNumber.toString();
  const transactionId = submitResponse.transactionId.toString();
  const mirrorBase = network === "mainnet"
    ? "https://mainnet-public.mirrornode.hedera.com"
    : "https://testnet.mirrornode.hedera.com";
  const mirrorUrl = `${mirrorBase}/api/v1/topics/${topicId}/messages?sequencenumber=eq:${sequenceNumber}`;
  let mirrorConfirmed = false;
  let mirrorMessage = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await fetch(mirrorUrl, { headers: { accept: "application/json" } });
    if (response.ok) {
      const body = await response.json();
      if (Array.isArray(body.messages) && body.messages.length > 0) {
        mirrorConfirmed = true;
        mirrorMessage = body.messages[0];
        break;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const hashscanBase = network === "mainnet" ? "https://hashscan.io/mainnet" : "https://hashscan.io/testnet";
  console.log(JSON.stringify({
    ...preview,
    topicId,
    sequenceNumber,
    transactionId,
    mirrorConfirmed,
    mirrorUrl,
    mirrorConsensusTimestamp: mirrorMessage?.consensus_timestamp || null,
    hashscanTopic: `${hashscanBase}/topic/${topicId}`,
    hashscanTransaction: `${hashscanBase}/transaction/${encodeURIComponent(transactionId)}`,
  }, null, 2));
} finally {
  client.close();
}
