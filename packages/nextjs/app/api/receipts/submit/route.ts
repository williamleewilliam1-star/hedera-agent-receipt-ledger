import { NextRequest, NextResponse } from "next/server";
import { getHederaRuntimeConfig, submitReceiptMessage } from "~~/services/receipts/hcs";
import { ReceiptInput, buildReceiptEnvelope } from "~~/services/receipts/receipt";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const config = getHederaRuntimeConfig();
  if (!config.configured) {
    return NextResponse.json({ error: "HCS write credentials are not configured." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as ReceiptInput & { topicId?: string };
    const built = buildReceiptEnvelope(body);
    const topicId = body.topicId?.trim() || config.topicId;
    if (!topicId) {
      return NextResponse.json(
        { error: "topicId is required when HEDERA_RECEIPT_TOPIC_ID is not configured." },
        { status: 400 },
      );
    }

    const hcs = await submitReceiptMessage(topicId, built.message);
    const explorerBase = hcs.network === "mainnet" ? "https://hashscan.io/mainnet" : "https://hashscan.io/testnet";
    return NextResponse.json({
      ...built,
      hcs,
      proof: {
        topic: `${explorerBase}/topic/${topicId}`,
        transaction: `${explorerBase}/transaction/${encodeURIComponent(hcs.transactionId)}`,
        mirror: `/api/receipts/verify?topicId=${encodeURIComponent(topicId)}&sequence=${encodeURIComponent(hcs.sequenceNumber)}&network=${hcs.network}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Receipt submission failed" },
      { status: 502 },
    );
  }
}
