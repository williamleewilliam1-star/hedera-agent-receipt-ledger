import { NextRequest, NextResponse } from "next/server";
import { JsonValue } from "~~/services/receipts/canonical";
import { addJsonArtifact } from "~~/services/receipts/ipfs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { artifact?: JsonValue };
    if (body.artifact === undefined) {
      return NextResponse.json({ error: "artifact is required" }, { status: 400 });
    }

    const stored = await addJsonArtifact(body.artifact);
    const gatewayBase = (process.env.IPFS_GATEWAY_URL || "https://ipfs.io/ipfs").replace(/\/$/, "");

    return NextResponse.json({
      ...stored,
      artifactUri: `ipfs://${stored.cid}`,
      gatewayUrl: `${gatewayBase}/${stored.cid}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "IPFS storage failed" },
      { status: 502 },
    );
  }
}
