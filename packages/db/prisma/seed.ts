import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  const seller = await prisma.entity.upsert({
    where: { slug: "rotterdam-industrial-supply" },
    update: {},
    create: {
      legalName: "Rotterdam Industrial Supply B.V.",
      slug: "rotterdam-industrial-supply",
      registrationNumber: "NL99887766",
      vatNumber: "NL123456789B01",
      countryCode: "NL",
      regulatoryRegime: "eu",
      entityType: "company",
      kybStatus: "verified",
      verificationTier: "premium",
      trustScore: 92,
      primaryCategory: "industrial_components"
    }
  });

  const buyer = await prisma.entity.upsert({
    where: { slug: "bavaria-public-works" },
    update: {},
    create: {
      legalName: "Bavaria Public Works Authority",
      slug: "bavaria-public-works",
      registrationNumber: "DE-PA-4477",
      countryCode: "DE",
      regulatoryRegime: "eu",
      entityType: "public_authority",
      kybStatus: "verified",
      verificationTier: "public_authority",
      trustScore: 99,
      primaryCategory: "public_procurement"
    }
  });

  const sellerAdmin = await prisma.user.upsert({
    where: { email: "admin@rotterdam-industrial.test" },
    update: {},
    create: {
      email: "admin@rotterdam-industrial.test",
      passwordHash: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36V9e4wJknhkXaoCA8DmF5K",
      firstName: "Mara",
      lastName: "Visser",
      role: "entity_admin",
      verificationTier: "premium",
      entityId: seller.id
    }
  });

  const buyerUser = await prisma.user.upsert({
    where: { email: "procurement@bavaria-public.test" },
    update: {},
    create: {
      email: "procurement@bavaria-public.test",
      passwordHash: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36V9e4wJknhkXaoCA8DmF5K",
      firstName: "Jonas",
      lastName: "Keller",
      role: "procurement_officer",
      verificationTier: "public_authority",
      entityId: buyer.id
    }
  });

  const existingWarehouse = await prisma.entityLocation.findFirst({
    where: {
      entityId: seller.id,
      label: "Rotterdam Port Warehouse"
    }
  });

  const warehouse =
    existingWarehouse ??
    (await prisma.entityLocation.create({
      data: {
        id: randomUUID(),
        entityId: seller.id,
        locationType: "warehouse",
        label: "Rotterdam Port Warehouse",
        addressLine1: "Waalhaven Zuidzijde 10",
        city: "Rotterdam",
        region: "Zuid-Holland",
        postalCode: "3089 JH",
        countryCode: "NL",
        latitude: 51.8826,
        longitude: 4.4477,
        geocodeStatus: "verified",
        geocodeProvider: "google",
        geocodeConfidence: 0.96,
        deliveryRadiusKm: 420,
        deliveryCountries: ["NL", "BE", "DE", "FR"],
        deliveryNotes: "Same-day for Benelux industrial corridors.",
        visibility: "city",
        addressVerified: true,
        verifiedMethod: "document_upload",
        isPrimary: true
      }
    }));

  await prisma.listing.upsert({
    where: { slug: "stainless-fasteners-eu-bulk" },
    update: {
      dispatchLocationId: warehouse.id,
      status: "active"
    },
    create: {
      title: "Stainless Steel Fasteners - EU Bulk Supply",
      slug: "stainless-fasteners-eu-bulk",
      summary: "Verified industrial fasteners with dispatch from Rotterdam.",
      description:
        "A high-volume fastener catalogue with dispatch from the Port of Rotterdam and next-day Benelux coverage.",
      category: "industrial_components",
      listingType: "product",
      status: "active",
      currency: "EUR",
      priceFromCents: 1200,
      minOrderQty: 1000,
      entityId: seller.id,
      dispatchLocationId: warehouse.id,
      showLocationOnListing: true
    }
  });

  let tender = await prisma.tender.findFirst({
    where: {
      authorityId: buyer.id,
      title: "Municipal Infrastructure Spare Parts Framework"
    }
  });

  if (!tender) {
    tender = await prisma.tender.create({
      data: {
        authorityId: buyer.id,
        title: "Municipal Infrastructure Spare Parts Framework",
        description: "Two-year framework agreement for city maintenance parts.",
        regime: "eu",
        thresholdBand: "below_threshold",
        geoEligibility: {
          type: "polygon",
          label: "Southern Bavaria service coverage",
          coordinates: [
            [11.34, 48.03],
            [11.91, 48.02],
            [12.11, 48.35],
            [11.44, 48.47],
            [11.34, 48.03]
          ]
        },
        deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
        status: "published"
      }
    });
  }

  let conversation = await prisma.conversation.findFirst({
    where: {
      title: "Fastener sourcing desk"
    }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        type: "ai_assisted",
        title: "Fastener sourcing desk",
        buyerEntityId: buyer.id,
        sellerEntityId: seller.id,
        tenderId: tender.id,
        modelProvider: "openai",
        modelName: "gpt-5.4-mini"
      }
    });
  }

  const existingParticipants = await prisma.conversationParticipant.findMany({
    where: { conversationId: conversation.id }
  });

  if (!existingParticipants.length) {
    await prisma.conversationParticipant.createMany({
      data: [
        {
          conversationId: conversation.id,
          userId: sellerAdmin.id,
          entityId: seller.id,
          role: "seller_owner"
        },
        {
          conversationId: conversation.id,
          userId: buyerUser.id,
          entityId: buyer.id,
          role: "buyer_owner"
        }
      ]
    });
  }

  const messageCount = await prisma.message.count({
    where: { conversationId: conversation.id }
  });

  if (!messageCount) {
    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          userId: buyerUser.id,
          senderType: "user",
          content: "Need same-week delivery to Munich for corrosion-resistant fasteners."
        },
        {
          conversationId: conversation.id,
          senderType: "ai",
          content:
            "Based on the Rotterdam dispatch location and 420km delivery radius metadata, a same-week Munich delivery is feasible only with carrier handoff. Suggest RFQ with destination postcode, incoterms, and required certification."
        }
      ]
    });
  }

  const sellerOwners = await prisma.beneficialOwner.findMany({
    where: { entityId: seller.id }
  });

  if (!sellerOwners.length) {
    await prisma.beneficialOwner.createMany({
      data: [
        {
          entityId: seller.id,
          firstName: "Mara",
          lastName: "Visser",
          fullNameNormalized: "mara visser",
          nationalityCountryCode: "NL",
          residenceCountryCode: "NL",
          ownershipPercent: 62,
          controlType: "shareholding",
          roleTitle: "Managing Director",
          identityVerificationStatus: "verified",
          screeningStatus: "cleared"
        },
        {
          entityId: seller.id,
          firstName: "Jonas",
          lastName: "Keller",
          fullNameNormalized: "jonas keller",
          nationalityCountryCode: "DE",
          residenceCountryCode: "DE",
          ownershipPercent: 23,
          controlType: "board_control",
          roleTitle: "Board Member",
          identityVerificationStatus: "manual_review",
          screeningStatus: "manual_review",
          pepDeclared: true
        }
      ]
    });
  }

  const existingComplianceCase = await prisma.complianceCase.findFirst({
    where: { entityId: seller.id, caseType: "kyb_refresh" }
  });

  let complianceCase = existingComplianceCase;
  if (!complianceCase) {
    complianceCase = await prisma.complianceCase.create({
      data: {
        entityId: seller.id,
        caseType: "kyb_refresh",
        status: "awaiting_review",
        riskBand: "high",
        priority: "urgent",
        initiatedBy: sellerAdmin.id,
        outcomeSummary: "Address evidence differs from the latest registry refresh.",
        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2)
      }
    });
  }

  const complianceChecksCount = await prisma.complianceCheck.count({
    where: { entityId: seller.id }
  });

  if (!complianceChecksCount) {
    await prisma.complianceCheck.createMany({
      data: [
        {
          entityId: seller.id,
          caseId: complianceCase.id,
          provider: "creditsafe",
          checkType: "kyb_registry_match",
          status: "manual_review",
          riskScore: 72,
          requestSnapshot: {
            legalName: "Rotterdam Industrial Supply B.V.",
            registrationNumber: "NL99887766"
          } as any,
          responseSnapshot: {
            registryMatched: false,
            providerReference: "CS-NL-NL99887766"
          } as any,
          startedAt: new Date(),
          completedAt: new Date()
        },
        {
          entityId: seller.id,
          caseId: complianceCase.id,
          provider: "complyadvantage",
          checkType: "pep_sanctions_screening",
          status: "manual_review",
          riskScore: 84,
          startedAt: new Date(),
          completedAt: new Date()
        }
      ]
    });
  }

  const complianceDocsCount = await prisma.complianceDocument.count({
    where: { entityId: seller.id }
  });

  if (!complianceDocsCount) {
    await prisma.complianceDocument.createMany({
      data: [
        {
          entityId: seller.id,
          caseId: complianceCase.id,
          documentType: "proof_of_address",
          fileName: "rotterdam-rates-bill.pdf",
          storageUrl: "s3://ib-marketplace/compliance/rotterdam-rates-bill.pdf",
          source: "user_upload",
          status: "accepted",
          issuedAt: new Date("2026-01-15T00:00:00.000Z"),
          expiresAt: new Date("2027-01-15T00:00:00.000Z"),
          reviewedAt: new Date()
        },
        {
          entityId: seller.id,
          caseId: complianceCase.id,
          documentType: "shareholder_register",
          fileName: "shareholder-register-q1-2026.pdf",
          storageUrl: "s3://ib-marketplace/compliance/shareholder-register-q1-2026.pdf",
          source: "user_upload",
          status: "submitted"
        }
      ]
    });
  }

  const screeningCount = await prisma.complianceScreeningMatch.count({
    where: { entityId: seller.id }
  });

  if (!screeningCount) {
    const jonas = await prisma.beneficialOwner.findFirst({
      where: { entityId: seller.id, firstName: "Jonas", lastName: "Keller" }
    });

    await prisma.complianceScreeningMatch.create({
      data: {
        entityId: seller.id,
        caseId: complianceCase.id,
        beneficialOwnerId: jonas?.id,
        subjectType: jonas ? "beneficial_owner" : "entity",
        provider: "complyadvantage",
        providerReference: "sca_demo_jonas_keller",
        matchedName: jonas ? "Jonas Keller" : "Rotterdam Industrial Supply B.V.",
        sourceList: "pep-list-demo",
        matchScore: 92.0,
        resolutionStatus: "potential_match"
      }
    });
  }

  const complianceEventCount = await prisma.complianceCaseEvent.count({
    where: { caseId: complianceCase.id }
  });

  if (!complianceEventCount) {
    await prisma.complianceCaseEvent.createMany({
      data: [
        {
          caseId: complianceCase.id,
          actorUserId: sellerAdmin.id,
          eventType: "compliance.case.created",
          toStatus: "pending_provider",
          note: "Seeded KYB refresh case for workspace demo"
        },
        {
          caseId: complianceCase.id,
          actorUserId: sellerAdmin.id,
          eventType: "compliance.screening.completed",
          fromStatus: "pending_provider",
          toStatus: "awaiting_review",
          note: "1 potential beneficial-owner PEP match"
        }
      ]
    });
  }


  const owner = await prisma.beneficialOwner.upsert({
    where: { id: "3c7cb14a-7840-40b0-b565-0b5f617f1111" },
    update: {},
    create: {
      id: "3c7cb14a-7840-40b0-b565-0b5f617f1111",
      entityId: seller.id,
      firstName: "Mara",
      lastName: "Visser",
      fullNameNormalized: "mara visser",
      ownershipPercent: 55,
      roleTitle: "Director",
      identityVerificationStatus: "verified",
      screeningStatus: "clear",
      pepDeclared: false,
      sanctionsDeclared: false
    }
  });

  const complianceCase = await prisma.complianceCase.create({
    data: {
      entityId: seller.id,
      caseType: "onboarding",
      status: "in_review",
      riskBand: "medium",
      priority: "normal",
      initiatedBy: sellerAdmin.id,
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      outcomeSummary: "Premium upgrade awaiting source-of-funds statement"
    }
  });

  await prisma.complianceCheck.createMany({
    data: [
      {
        entityId: seller.id,
        caseId: complianceCase.id,
        provider: "creditsafe",
        checkType: "registry_profile",
        status: "passed",
        riskScore: 6,
        startedAt: new Date(),
        completedAt: new Date()
      },
      {
        entityId: seller.id,
        caseId: complianceCase.id,
        provider: "comply_advantage",
        checkType: "sanctions",
        status: "passed",
        riskScore: 4,
        startedAt: new Date(),
        completedAt: new Date()
      },
      {
        entityId: seller.id,
        caseId: complianceCase.id,
        beneficialOwnerId: owner.id,
        provider: "manual_admin",
        checkType: "beneficial_owner",
        status: "passed",
        riskScore: 10,
        startedAt: new Date(),
        completedAt: new Date()
      }
    ]
  });

  await prisma.complianceDocument.create({
    data: {
      entityId: seller.id,
      caseId: complianceCase.id,
      documentType: "proof_of_address",
      fileName: "rotterdam-proof-of-address.pdf",
      storageUrl: "s3://ib-marketplace-demo/compliance/rotterdam-proof-of-address.pdf",
      status: "submitted"
    }
  });

  await prisma.complianceCaseEvent.create({
    data: {
      caseId: complianceCase.id,
      actorUserId: sellerAdmin.id,
      eventType: "compliance.case.created",
      toStatus: "in_review",
      note: "Seeded premium verification case",
      metadata: {
        targetTier: "premium",
        requiredChecks: ["registry_profile", "sanctions", "beneficial_owner"],
        requiredDocuments: ["proof_of_address", "ubo_declaration"]
      }
    }
  });

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
