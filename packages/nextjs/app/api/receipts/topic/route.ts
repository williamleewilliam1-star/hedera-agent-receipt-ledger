import { NextRequest, NextResponse } from "next/server";
import { createReceiptTopic, getHederaRuntimeConfig } from "~~/services/receipts/hcs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const config = getHederaRuntimeConfig();
  if (!config.configured) {
    return NextResponse.json(
      { error: "HCS write credentials are not configured. Set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { memo?: string };
    return NextResponse.json(await createReceiptTopic(body.memo || "Agent Receipt Ledger"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Topic creation failed" },
      { status: 502 },
    );
  }
}
