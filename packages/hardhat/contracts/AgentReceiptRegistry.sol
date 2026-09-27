// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AgentReceiptRegistry {
    struct Offer {
        address provider;
        uint96 priceTinybar;
        bytes32 metadataDigest;
        bool active;
    }

    struct Receipt {
        bytes32 offerId;
        bytes32 artifactDigest;
        bytes32 hcsMessageDigest;
        uint64 hcsSequence;
        uint64 createdAt;
        address provider;
    }

    mapping(bytes32 => Offer) public offers;
    mapping(bytes32 => Receipt) public receipts;

    event OfferRegistered(
        bytes32 indexed offerId,
        address indexed provider,
        uint96 priceTinybar,
        bytes32 metadataDigest
    );
    event OfferStatusChanged(bytes32 indexed offerId, bool active);
    event ReceiptAnchored(
        bytes32 indexed receiptId,
        bytes32 indexed offerId,
        bytes32 artifactDigest,
        bytes32 hcsMessageDigest,
        uint64 hcsSequence
    );

    error InvalidId();
    error OfferExists();
    error OfferMissing();
    error ReceiptExists();
    error NotProvider();
    error InactiveOffer();
    error InvalidReceipt();

    function registerOffer(bytes32 offerId, uint96 priceTinybar, bytes32 metadataDigest) external {
        if (offerId == bytes32(0)) revert InvalidId();
        if (offers[offerId].provider != address(0)) revert OfferExists();
        offers[offerId] = Offer(msg.sender, priceTinybar, metadataDigest, true);
        emit OfferRegistered(offerId, msg.sender, priceTinybar, metadataDigest);
    }

    function setOfferActive(bytes32 offerId, bool active) external {
        Offer storage offer = offers[offerId];
        if (offer.provider == address(0)) revert OfferMissing();
        if (offer.provider != msg.sender) revert NotProvider();
        offer.active = active;
        emit OfferStatusChanged(offerId, active);
    }

    function anchorReceipt(
        bytes32 receiptId,
        bytes32 offerId,
        bytes32 artifactDigest,
        bytes32 hcsMessageDigest,
        uint64 hcsSequence
    ) external {
        if (
            receiptId == bytes32(0) ||
            artifactDigest == bytes32(0) ||
            hcsMessageDigest == bytes32(0) ||
            hcsSequence == 0
        ) {
            revert InvalidReceipt();
        }
        if (receipts[receiptId].provider != address(0)) revert ReceiptExists();
        Offer memory offer = offers[offerId];
        if (offer.provider == address(0)) revert OfferMissing();
        if (!offer.active) revert InactiveOffer();
        if (offer.provider != msg.sender) revert NotProvider();

        receipts[receiptId] = Receipt({
            offerId: offerId,
            artifactDigest: artifactDigest,
            hcsMessageDigest: hcsMessageDigest,
            hcsSequence: hcsSequence,
            createdAt: uint64(block.timestamp),
            provider: msg.sender
        });

        emit ReceiptAnchored(receiptId, offerId, artifactDigest, hcsMessageDigest, hcsSequence);
    }
}
