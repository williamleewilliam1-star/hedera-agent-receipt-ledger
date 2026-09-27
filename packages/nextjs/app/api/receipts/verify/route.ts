import { NextRequest, NextResponse } from "next/server";
import { getMirrorReceipt } from "~~/services/receipts/mirror";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const topicId = request.nextUrl.searchParams.get("topicId")?.trim();
  const sequence = request.nextUrl.searchParams.get("sequence")?.trim();
  const network = request.nextUrl.searchParams.get("network")?.trim() || "testnet";

  if (!topicId || !sequence) {
    return NextResponse.json({ error: "topicId and sequence are required" }, { status: 400 });
  }
  if (network !== "testnet" && network !== "mainnet") {
    return NextResponse.json({ error: "network must be testnet or mainnet" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getMirrorReceipt(topicId, sequence, network));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mirror Node verification failed" },
      { status: 502 },
    );
  }
}
