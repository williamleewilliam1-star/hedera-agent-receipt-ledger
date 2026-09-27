import { JsonValue, canonicalJson, sha256Hex } from "./canonical";

export type IpfsArtifact = {
  cid: string;
  size: number;
  sha256: string;
  canonical: string;
};

export async function addJsonArtifact(payload: JsonValue): Promise<IpfsArtifact> {
  const canonical = canonicalJson(payload);
  const sha256 = sha256Hex(canonical);
  const apiBase = process.env.IPFS_API_URL ?? "http://127.0.0.1:5001";
  const url = new URL("/api/v0/add", apiBase);
  url.searchParams.set("pin", "true");
  url.searchParams.set("cid-version", "1");

  const form = new FormData();
  form.append("file", new Blob([canonical], { type: "application/json" }), "artifact.json");

  const response = await fetch(url, { method: "POST", body: form, cache: "no-store" });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`IPFS add failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const lines = (await response.text()).trim().split("\n").filter(Boolean);
  const parsed = JSON.parse(lines.at(-1) ?? "{}") as { Hash?: string; Size?: string };
  if (!parsed.Hash) throw new Error("IPFS add response did not contain a CID");

  return {
    cid: parsed.Hash,
    size: Number.parseInt(parsed.Size ?? String(Buffer.byteLength(canonical)), 10),
    sha256,
    canonical,
  };
}
