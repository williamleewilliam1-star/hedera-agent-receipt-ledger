import { NextResponse } from "next/server";
import { getHederaRuntimeConfig } from "~~/services/receipts/hcs";

export const runtime = "nodejs";

export async function GET() {
  const config = getHederaRuntimeConfig();
  return NextResponse.json({
    service: "Agent Receipt Ledger",
    network: config.network,
    writeConfigured: config.configured,
    topicConfigured: Boolean(config.topicId),
    topicId: config.topicId,
    mirrorUrl: process.env.NEXT_PUBLIC_HEDERA_MIRROR_URL || `https://${config.network}.mirrornode.hedera.com`,
    note: config.configured
      ? "HCS writes are configured on the server."
      : "Preview and Mirror Node verification work without operator credentials.",
  });
}
