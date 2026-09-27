import { expect } from "chai";
import { ethers } from "hardhat";

describe("AgentReceiptRegistry", function () {
  async function fixture() {
    const [provider, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AgentReceiptRegistry");
    const registry = await Factory.deploy();
    await registry.waitForDeployment();
    return { registry, provider, stranger };
  }

  it("registers an offer and anchors one HCS-backed receipt", async function () {
    const { registry, provider } = await fixture();
    const offerId = ethers.id("offer:content-analysis");
    const metadataDigest = ethers.sha256(ethers.toUtf8Bytes('{"service":"analysis"}'));
    const receiptId = ethers.id("receipt:001");
    const artifactDigest = ethers.sha256(ethers.toUtf8Bytes('{"result":"ok"}'));
    const hcsDigest = ethers.sha256(ethers.toUtf8Bytes('{"cid":"bafy-test"}'));

    await expect(registry.connect(provider).registerOffer(offerId, 100_000_000n, metadataDigest))
      .to.emit(registry, "OfferRegistered")
      .withArgs(offerId, provider.address, 100_000_000n, metadataDigest);

    await expect(registry.connect(provider).anchorReceipt(receiptId, offerId, artifactDigest, hcsDigest, 7))
      .to.emit(registry, "ReceiptAnchored")
      .withArgs(receiptId, offerId, artifactDigest, hcsDigest, 7);

    const receipt = await registry.receipts(receiptId);
    expect(receipt.offerId).to.equal(offerId);
    expect(receipt.artifactDigest).to.equal(artifactDigest);
    expect(receipt.hcsMessageDigest).to.equal(hcsDigest);
    expect(receipt.hcsSequence).to.equal(7n);
    expect(receipt.provider).to.equal(provider.address);
  });

  it("rejects duplicate receipts and non-provider anchors", async function () {
    const { registry, provider, stranger } = await fixture();
    const offerId = ethers.id("offer:dedupe");
    const receiptId = ethers.id("receipt:dedupe");
    const artifactDigest = ethers.sha256(ethers.toUtf8Bytes("artifact"));
    const hcsDigest = ethers.sha256(ethers.toUtf8Bytes("hcs"));

    await registry.connect(provider).registerOffer(offerId, 1n, ethers.ZeroHash);

    await expect(
      registry.connect(stranger).anchorReceipt(receiptId, offerId, artifactDigest, hcsDigest, 1),
    ).to.be.revertedWithCustomError(registry, "NotProvider");

    await registry.connect(provider).anchorReceipt(receiptId, offerId, artifactDigest, hcsDigest, 1);

    await expect(
      registry.connect(provider).anchorReceipt(receiptId, offerId, artifactDigest, hcsDigest, 2),
    ).to.be.revertedWithCustomError(registry, "ReceiptExists");
  });
});
