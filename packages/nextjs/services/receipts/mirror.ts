import { sha256Hex } from "./canonical";

type MirrorTopicMessage = {
  consensus_timestamp: string;
  message: string;
  payer_account_id?: string;
  running_hash: string;
  sequence_number: number;
  topic_id: string;
};

function mirrorBase(network: string) {
  const override = process.env.NEXT_PUBLIC_HEDERA_MIRROR_URL?.trim();
  if (override) return override.replace(/\/$/, "");
  return network === "mainnet" ? "https://mainnet.mirrornode.hedera.com" : "https://testnet.mirrornode.hedera.com";
}

export async function getMirrorReceipt(topicId: string, sequenceNumber: string, network = "testnet") {
  const url = `${mirrorBase(network)}/api/v1/topics/${encodeURIComponent(topicId)}/messages/${encodeURIComponent(sequenceNumber)}`;
  const response = await fetch(url, { cache: "no-store" });
  const text = await response.text();
  if (!response.ok) throw new Error(`Mirror Node returned ${response.status}: ${text.slice(0, 240)}`);
  const parsed = JSON.parse(text) as MirrorTopicMessage | { messages?: MirrorTopicMessage[] };
  const message = "messages" in parsed ? parsed.messages?.[0] : (parsed as MirrorTopicMessage);
  if (!message) throw new Error("Mirror Node response did not contain the requested topic message");

  const decoded = Buffer.from(message.message, "base64").toString("utf8");
  return {
    ...message,
    decoded,
    messageDigest: sha256Hex(decoded),
    mirrorUrl: url,
  };
}
