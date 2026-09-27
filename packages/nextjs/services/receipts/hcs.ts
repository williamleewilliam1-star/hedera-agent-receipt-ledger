import {
  AccountId,
  Client,
  PrivateKey,
  TopicCreateTransaction,
  TopicId,
  TopicMessageSubmitTransaction,
} from "@hiero-ledger/sdk";

export type HcsNetwork = "testnet" | "mainnet";

export function getHederaRuntimeConfig() {
  const accountId = process.env.HEDERA_OPERATOR_ID?.trim();
  const privateKey = process.env.HEDERA_OPERATOR_KEY?.trim();
  const network = (process.env.HEDERA_NETWORK?.trim() || "testnet") as HcsNetwork;
  if (network !== "testnet" && network !== "mainnet") {
    throw new Error("HEDERA_NETWORK must be testnet or mainnet");
  }
  return {
    accountId,
    privateKey,
    network,
    topicId: process.env.HEDERA_RECEIPT_TOPIC_ID?.trim() || null,
    configured: Boolean(accountId && privateKey),
  };
}
function createClient() {
  const config = getHederaRuntimeConfig();
  if (!config.accountId || !config.privateKey) {
    throw new Error("HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY are required for HCS writes");
  }
  const client = config.network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(AccountId.fromString(config.accountId), PrivateKey.fromString(config.privateKey));
  return { client, config };
}

export async function createReceiptTopic(memo = "Agent Receipt Ledger") {
  const { client, config } = createClient();
  try {
    const response = await new TopicCreateTransaction().setTopicMemo(memo.slice(0, 100)).execute(client);
    const receipt = await response.getReceipt(client);
    if (!receipt.topicId) throw new Error("HCS topic creation succeeded without a topic ID");
    return {
      network: config.network,
      topicId: receipt.topicId.toString(),
      transactionId: response.transactionId.toString(),
      status: receipt.status.toString(),
    };
  } finally {
    client.close();
  }
}
export async function submitReceiptMessage(topicId: string, message: string) {
  if (!topicId.trim()) throw new Error("topicId is required");
  const { client, config } = createClient();
  try {
    const response = await new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(message)
      .execute(client);
    const receipt = await response.getReceipt(client);
    if (receipt.topicSequenceNumber == null || receipt.topicRunningHash == null) {
      throw new Error("HCS submit receipt did not include a sequence number and running hash");
    }
    return {
      network: config.network,
      topicId,
      transactionId: response.transactionId.toString(),
      status: receipt.status.toString(),
      sequenceNumber: receipt.topicSequenceNumber.toString(),
      runningHashHex: Buffer.from(receipt.topicRunningHash).toString("hex"),
    };
  } finally {
    client.close();
  }
}
