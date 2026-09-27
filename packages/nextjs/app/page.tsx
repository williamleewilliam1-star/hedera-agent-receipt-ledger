"use client";

import { useEffect, useState } from "react";

type RuntimeStatus = {
  network: "testnet" | "mainnet";
  writeConfigured: boolean;
  topicConfigured: boolean;
  topicId: string | null;
  mirrorUrl: string;
  note: string;
};

type ReceiptResult = {
  artifactDigest?: string;
  messageDigest?: string;
  messageBytes?: number;
  canonicalArtifact?: string;
  hcs?: { topicId: string; sequenceNumber: string; transactionId: string; status: string };
  proof?: { topic: string; transaction: string; mirror: string };
  error?: string;
};

const SAMPLE_ARTIFACT = JSON.stringify(
  { result: "completed", summary: "Research brief delivered", sourceCount: 6, version: 1 },
  null,
  2,
);
export default function Home() {
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [jobId, setJobId] = useState("research-brief-001");
  const [provider, setProvider] = useState("babydov-agent");
  const [artifactUri, setArtifactUri] = useState("");
  const [artifactText, setArtifactText] = useState(SAMPLE_ARTIFACT);
  const [topicId, setTopicId] = useState("");
  const [result, setResult] = useState<ReceiptResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/receipts/status")
      .then(response => response.json())
      .then((data: RuntimeStatus) => {
        setRuntime(data);
        if (data.topicId) setTopicId(data.topicId);
      })
      .catch(() => setRuntime(null));
  }, []);

  function requestBody() {
    return {
      jobId,
      provider,
      artifactUri: artifactUri || undefined,
      artifact: JSON.parse(artifactText),
      topicId: topicId || undefined,
    };
  }
  async function call(path: string, body: unknown) {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as ReceiptResult;
      setResult(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      setResult({ error: message });
      return { error: message };
    } finally {
      setBusy(false);
    }
  }

  async function preview() {
    try {
      await call("/api/receipts/preview", requestBody());
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Artifact JSON is invalid" });
    }
  }
  async function createTopic() {
    const data = await call("/api/receipts/topic", { memo: "Agent Receipt Ledger" });
    const createdTopic = (data as ReceiptResult & { topicId?: string }).topicId;
    if (createdTopic) setTopicId(createdTopic);
  }

  async function publish() {
    try {
      await call("/api/receipts/submit", requestBody());
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Artifact JSON is invalid" });
    }
  }

  return (
    <main className="min-h-screen bg-base-200 px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="badge badge-primary badge-outline mb-3">Scaffold-HBAR template</div>
          <h1 className="text-4xl font-bold">Agent Receipt Ledger</h1>
          <p className="mt-3 max-w-3xl text-base-content/70">
            Turn an AI-agent work artifact into a deterministic digest, publish a compact receipt to Hedera Consensus
            Service, and verify the exact message independently through a Hedera Mirror Node.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">1. Build a verifiable receipt</h2>
              <label className="form-control">
                <span className="label-text mb-2">Job ID</span>
                <input
                  className="input input-bordered"
                  value={jobId}
                  onChange={event => setJobId(event.target.value)}
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="form-control">
                  <span className="label-text mb-2">Provider</span>
                  <input
                    className="input input-bordered"
                    value={provider}
                    onChange={event => setProvider(event.target.value)}
                  />
                </label>
                <label className="form-control">
                  <span className="label-text mb-2">Artifact URI (optional)</span>
                  <input
                    className="input input-bordered"
                    value={artifactUri}
                    onChange={event => setArtifactUri(event.target.value)}
                    placeholder="ipfs://... or https://..."
                  />
                </label>
              </div>
              <label className="form-control">
                <span className="label-text mb-2">Artifact JSON</span>
                <textarea
                  className="textarea textarea-bordered min-h-44 font-mono text-xs"
                  value={artifactText}
                  onChange={event => setArtifactText(event.target.value)}
                />
              </label>
              <div className="card-actions mt-2">
                <button className="btn btn-primary" onClick={preview} disabled={busy}>
                  Preview digest
                </button>
                <button className="btn btn-secondary" onClick={publish} disabled={busy || !runtime?.writeConfigured}>
                  Publish to HCS
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">2. Hedera runtime</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-lg">{runtime?.network || "loading"}</span>
                  <span className={`badge badge-lg ${runtime?.writeConfigured ? "badge-success" : "badge-warning"}`}>
                    {runtime?.writeConfigured ? "HCS writes configured" : "read-only mode"}
                  </span>
                </div>
                <p className="text-sm text-base-content/70">{runtime?.note || "Loading runtime status…"}</p>
                <label className="form-control">
                  <span className="label-text mb-2">Receipt topic ID</span>
                  <input
                    className="input input-bordered font-mono"
                    value={topicId}
                    onChange={event => setTopicId(event.target.value)}
                    placeholder="0.0.x"
                  />
                </label>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={createTopic}
                  disabled={busy || !runtime?.writeConfigured}
                >
                  Create HCS topic
                </button>
              </div>
            </div>
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">3. Proof</h2>
                {!result ? (
                  <p className="text-sm text-base-content/60">Preview or publish a receipt to see its proof.</p>
                ) : null}
                {result?.error ? <div className="alert alert-error text-sm">{result.error}</div> : null}
                {result?.artifactDigest ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-semibold">Artifact SHA-256</div>
                      <code className="break-all text-xs">{result.artifactDigest}</code>
                    </div>
                    <div>
                      <div className="font-semibold">HCS message SHA-256</div>
                      <code className="break-all text-xs">{result.messageDigest}</code>
                    </div>
                    <div>
                      Envelope size: <strong>{result.messageBytes}</strong> bytes
                    </div>
                  </div>
                ) : null}
                {result?.hcs ? (
                  <div className="alert alert-success mt-3 block text-sm">
                    <div>
                      HCS sequence <strong>#{result.hcs.sequenceNumber}</strong> · {result.hcs.status}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a className="link" href={result.proof?.topic} target="_blank" rel="noreferrer">
                        Hashscan topic
                      </a>
                      <a className="link" href={result.proof?.transaction} target="_blank" rel="noreferrer">
                        Transaction
                      </a>
                      <a className="link" href={result.proof?.mirror} target="_blank" rel="noreferrer">
                        Mirror proof
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Deterministic", "Canonical JSON prevents object-key ordering from changing the artifact digest."],
            [
              "Hedera-native",
              "HCS gives consensus ordering, timestamping, sequence numbers and a public running hash.",
            ],
            [
              "Independently verifiable",
              "Mirror Node verification does not trust the app server that created the receipt.",
            ],
          ].map(([title, copy]) => (
            <div key={title} className="card border border-base-300 bg-base-100">
              <div className="card-body p-5">
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm text-base-content/70">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
