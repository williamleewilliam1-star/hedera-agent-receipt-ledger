import { NextRequest, NextResponse } from "next/server";
import { ReceiptInput, buildReceiptEnvelope } from "~~/services/receipts/receipt";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as ReceiptInput;
    return NextResponse.json(buildReceiptEnvelope(input));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid receipt input" },
      { status: 400 },
    );
  }
}
