import { JsonValue, canonicalJson, sha256Hex } from "./canonical";

export type ReceiptInput = {
  jobId: string;
  artifact: JsonValue;
  artifactUri?: string;
  provider?: string;
  receiptId?: string;
};

export type ReceiptEnvelope = {
  schema: "babydov.agent_receipt.v1";
  receiptId: string;
  jobId: string;
  artifactDigest: string;
  artifactUri: string | null;
  provider: string | null;
};

export function buildReceiptEnvelope(input: ReceiptInput) {
  const jobId = input.jobId.trim();
  if (!jobId) throw new Error("jobId is required");

  const canonicalArtifact = canonicalJson(input.artifact);
  const artifactDigest = sha256Hex(canonicalArtifact);
  const receiptId = input.receiptId?.trim() || sha256Hex(canonicalJson({ artifactDigest, jobId }));
  const envelope: ReceiptEnvelope = {
    schema: "babydov.agent_receipt.v1",
    receiptId,
    jobId,
    artifactDigest,
    artifactUri: input.artifactUri?.trim() || null,
    provider: input.provider?.trim() || null,
  };
  const message = canonicalJson(envelope);
  const messageBytes = Buffer.byteLength(message);

  if (messageBytes > 900) {
    throw new Error(`HCS receipt envelope is ${messageBytes} bytes; keep it at or below 900 bytes`);
  }

  return {
    envelope,
    canonicalArtifact,
    artifactDigest,
    message,
    messageDigest: sha256Hex(message),
    messageBytes,
  };
}
