import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

faker.seed(42);

const COUNTRIES = [
  "GB",
  "DE",
  "SE",
  "FI",
  "NO",
  "NL",
  "MT",
  "IE",
  "AT",
  "CA",
  "NZ",
  "AU",
  "ES",
  "PT",
  "IT",
];
const PROVIDERS = [
  "NetEnt",
  "Pragmatic Play",
  "Evolution",
  "Play'n GO",
  "Microgaming",
  "Yggdrasil",
  "Red Tiger",
  "BTG",
];
const GAME_NAMES = [
  "Starburst",
  "Gonzo's Quest",
  "Book of Dead",
  "Sweet Bonanza",
  "Gates of Olympus",
  "Wolf Gold",
  "Big Bass Bonanza",
  "Jammin' Jars",
  "Reactoonz",
  "Dead or Alive 2",
  "Fire Joker",
  "Legacy of Dead",
  "Sakura Fortune",
  "Thunder Screech",
  "Rise of Merlin",
  "Crazy Time",
  "Lightning Roulette",
  "Blackjack Classic",
  "Plinko",
  "Mines",
];

async function main() {
  console.log("Seeding admin database...");

  // Clear existing data
  await prisma.$executeRaw`TRUNCATE TABLE audit_logs, admin_notes, kyc_documents, bonuses, game_rounds, game_sessions, transactions, promotions, games, users, admin_users CASCADE`;

  // 1. Admin Users
  console.log("Creating admin users...");
  const passwordHash = await bcrypt.hash("admin123", 12);
  const [admin1, admin2] = await Promise.all([
    prisma.adminUser.create({
      data: { email: "admin@slotsone.com", passwordHash, name: "Admin User", role: "ADMIN" },
    }),
    prisma.adminUser.create({
      data: {
        email: "superadmin@slotsone.com",
        passwordHash,
        name: "Super Admin",
        role: "SUPERADMIN",
      },
    }),
  ]);
  const adminIds = [admin1.id, admin2.id];

  // 2. Games
  console.log("Creating games...");
  const categories: Array<"SLOTS" | "TABLE" | "LIVE" | "INSTANT"> = [
    "SLOTS",
    "TABLE",
    "LIVE",
    "INSTANT",
  ];
  const gameData = GAME_NAMES.map((name, i) => ({
    slug: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-$/, ""),
    name,
    provider: PROVIDERS[i % PROVIDERS.length],
    category: i < 15 ? ("SLOTS" as const) : categories[i % categories.length],
    rtp: parseFloat((94 + Math.random() * 3).toFixed(2)),
    isActive: Math.random() > 0.1,
    isFeatured: i < 5,
    minBet: parseFloat(faker.helpers.arrayElement(["0.10", "0.20", "0.50", "1.00"])),
    maxBet: parseFloat(faker.helpers.arrayElement(["50.00", "100.00", "200.00", "500.00"])),
  }));
  await prisma.game.createMany({ data: gameData });
  const games = await prisma.game.findMany();

  // 3. Players (Users)
  console.log("Creating 500 players...");
  const userStatuses: Array<
    "ACTIVE" | "SUSPENDED" | "BANNED" | "SELF_EXCLUDED" | "PENDING_VERIFICATION"
  > = [
    "ACTIVE",
    "ACTIVE",
    "ACTIVE",
    "ACTIVE",
    "ACTIVE",
    "ACTIVE",
    "ACTIVE",
    "SUSPENDED",
    "BANNED",
    "SELF_EXCLUDED",
    "PENDING_VERIFICATION",
  ];
  const userRoles: Array<"PLAYER" | "VIP" | "TESTER"> = [
    "PLAYER",
    "PLAYER",
    "PLAYER",
    "PLAYER",
    "VIP",
    "TESTER",
  ];
  const riskLevels: Array<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL"> = [
    "LOW",
    "LOW",
    "LOW",
    "MEDIUM",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
  ];

  const userData = Array.from({ length: 500 }, (_, i) => {
    const deposited = parseFloat(faker.finance.amount({ min: 0, max: 50000, dec: 2 }));
    const withdrawn = parseFloat(faker.finance.amount({ min: 0, max: deposited * 0.8, dec: 2 }));
    const wagered = parseFloat(
      faker.finance.amount({ min: deposited * 0.5, max: deposited * 10, dec: 2 })
    );
    const won = parseFloat(
      faker.finance.amount({ min: wagered * 0.3, max: wagered * 1.1, dec: 2 })
    );
    const balance = parseFloat(faker.finance.amount({ min: 0, max: 10000, dec: 2 }));
    const kycVerified = Math.random() > 0.35;
    return {
      email: faker.internet
        .email({ firstName: faker.person.firstName(), lastName: faker.person.lastName() })
        .toLowerCase(),
      username: faker.internet.username() + i,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      status: faker.helpers.arrayElement(userStatuses),
      role: faker.helpers.arrayElement(userRoles),
      balanceReal: balance,
      balanceBonus:
        Math.random() > 0.7 ? parseFloat(faker.finance.amount({ min: 5, max: 500, dec: 2 })) : 0,
      currency: "EUR",
      country: faker.helpers.arrayElement(COUNTRIES),
      kycVerified,
      riskLevel: faker.helpers.arrayElement(riskLevels),
      totalDeposited: deposited,
      totalWithdrawn: withdrawn,
      totalWagered: wagered,
      totalWon: won,
      tags: JSON.stringify(
        faker.helpers.arrayElements(["whale", "bonus-abuser", "vip", "new", "churned", "loyal"], {
          min: 0,
          max: 3,
        })
      ),
      lastLoginAt: faker.date.recent({ days: 30 }),
      registeredAt: faker.date.past({ years: 2 }),
    };
  });
  await prisma.user.createMany({ data: userData });
  const users = await prisma.user.findMany({ select: { id: true } });
  const userIds = users.map((u) => u.id);

  // 4. Promotions
  console.log("Creating promotions...");
  const bonusTypes: Array<
    "WELCOME" | "DEPOSIT_MATCH" | "FREE_SPINS" | "CASHBACK" | "LOYALTY" | "CUSTOM"
  > = ["WELCOME", "DEPOSIT_MATCH", "FREE_SPINS", "CASHBACK", "LOYALTY", "CUSTOM"];
  const promoData = Array.from({ length: 10 }, () => ({
    name: faker.commerce.productName() + " Bonus",
    description: faker.lorem.sentence(),
    type: faker.helpers.arrayElement(bonusTypes),
    amount: parseFloat(faker.finance.amount({ min: 10, max: 500, dec: 2 })),
    wagerRequirement: parseFloat(faker.finance.amount({ min: 500, max: 5000, dec: 2 })),
    isActive: Math.random() > 0.3,
    startsAt: faker.date.past({ years: 1 }),
    endsAt: Math.random() > 0.4 ? faker.date.future({ years: 1 }) : null,
    targetSegment: JSON.stringify({
      minDeposit: 20,
      countries: faker.helpers.arrayElements(COUNTRIES, { min: 2, max: 5 }),
    }),
    maxRedemptions: faker.helpers.arrayElement([null, 100, 500, 1000]),
    redemptions: faker.number.int({ min: 0, max: 200 }),
  }));
  await prisma.promotion.createMany({ data: promoData });
  const promotions = await prisma.promotion.findMany({ select: { id: true } });
  const promoIds = promotions.map((p) => p.id);

  // 5. Transactions (10,000 in batches)
  console.log("Creating 10,000 transactions...");
  const txTypes: Array<
    "DEPOSIT" | "WITHDRAWAL" | "BET" | "WIN" | "BONUS_CREDIT" | "ADJUSTMENT" | "REFUND"
  > = [
    "DEPOSIT",
    "DEPOSIT",
    "BET",
    "BET",
    "BET",
    "BET",
    "WIN",
    "WIN",
    "WIN",
    "WITHDRAWAL",
    "BONUS_CREDIT",
  ];
  const txStatuses: Array<"COMPLETED" | "PENDING" | "FAILED"> = [
    "COMPLETED",
    "COMPLETED",
    "COMPLETED",
    "COMPLETED",
    "PENDING",
    "FAILED",
  ];

  for (let batch = 0; batch < 10; batch++) {
    const txData = Array.from({ length: 1000 }, () => {
      const type = faker.helpers.arrayElement(txTypes);
      let amount = 0;
      switch (type) {
        case "DEPOSIT":
          amount = parseFloat(faker.finance.amount({ min: 10, max: 5000, dec: 2 }));
          break;
        case "WITHDRAWAL":
          amount = parseFloat(faker.finance.amount({ min: 10, max: 3000, dec: 2 }));
          break;
        case "BET":
          amount = parseFloat(faker.finance.amount({ min: 0.2, max: 50, dec: 2 }));
          break;
        case "WIN":
          amount = parseFloat(faker.finance.amount({ min: 0, max: 500, dec: 2 }));
          break;
        case "BONUS_CREDIT":
          amount = parseFloat(faker.finance.amount({ min: 5, max: 200, dec: 2 }));
          break;
        default:
          amount = parseFloat(faker.finance.amount({ min: 1, max: 100, dec: 2 }));
      }
      const balanceBefore = parseFloat(faker.finance.amount({ min: 0, max: 10000, dec: 2 }));
      const isCredit = ["DEPOSIT", "WIN", "BONUS_CREDIT", "REFUND"].includes(type);
      const balanceAfter = isCredit ? balanceBefore + amount : Math.max(0, balanceBefore - amount);
      return {
        userId: faker.helpers.arrayElement(userIds),
        type,
        amount,
        status: faker.helpers.arrayElement(txStatuses),
        balanceBefore,
        balanceAfter,
        currency: "EUR",
        description:
          type === "DEPOSIT" ? "Card deposit" : type === "WITHDRAWAL" ? "Bank withdrawal" : null,
        createdAt: faker.date.recent({ days: 90 }),
      };
    });
    await prisma.transaction.createMany({ data: txData });
    console.log(`  Transactions batch ${batch + 1}/10`);
  }

  // 6. Game Sessions (2,000)
  console.log("Creating 2,000 game sessions...");
  const sessionData = Array.from({ length: 2000 }, () => {
    const totalBet = parseFloat(faker.finance.amount({ min: 5, max: 2000, dec: 2 }));
    const totalWin = parseFloat(faker.finance.amount({ min: 0, max: totalBet * 1.5, dec: 2 }));
    const startedAt = faker.date.recent({ days: 90 });
    return {
      userId: faker.helpers.arrayElement(userIds),
      gameId: faker.helpers.arrayElement(games).id,
      startedAt,
      endedAt: new Date(startedAt.getTime() + faker.number.int({ min: 60000, max: 7200000 })),
      totalBet,
      totalWin,
      roundsPlayed: faker.number.int({ min: 5, max: 500 }),
    };
  });
  await prisma.gameSession.createMany({ data: sessionData });
  const sessions = await prisma.gameSession.findMany({
    select: { id: true, userId: true, gameId: true, startedAt: true },
  });

  // 7. Game Rounds (50,000 in batches of 5,000)
  console.log("Creating 50,000 game rounds...");
  for (let batch = 0; batch < 10; batch++) {
    const roundData = Array.from({ length: 5000 }, () => {
      const session = faker.helpers.arrayElement(sessions);
      const betAmount = parseFloat(faker.finance.amount({ min: 0.1, max: 50, dec: 2 }));
      return {
        sessionId: session.id,
        userId: session.userId,
        gameId: session.gameId,
        betAmount,
        winAmount:
          Math.random() > 0.6
            ? parseFloat(faker.finance.amount({ min: 0, max: betAmount * 50, dec: 2 }))
            : 0,
        createdAt: faker.date.recent({ days: 90 }),
      };
    });
    await prisma.gameRound.createMany({ data: roundData });
    console.log(`  Rounds batch ${batch + 1}/10`);
  }

  // 8. Bonuses (100)
  console.log("Creating 100 bonuses...");
  const bonusStatuses: Array<"ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED" | "FORFEITED"> = [
    "ACTIVE",
    "ACTIVE",
    "COMPLETED",
    "EXPIRED",
    "CANCELLED",
    "FORFEITED",
  ];
  const bonusData = Array.from({ length: 100 }, () => {
    const wagerReq = parseFloat(faker.finance.amount({ min: 200, max: 5000, dec: 2 }));
    const status = faker.helpers.arrayElement(bonusStatuses);
    return {
      userId: faker.helpers.arrayElement(userIds),
      promotionId: Math.random() > 0.4 ? faker.helpers.arrayElement(promoIds) : null,
      type: faker.helpers.arrayElement(bonusTypes),
      status,
      amount: parseFloat(faker.finance.amount({ min: 5, max: 500, dec: 2 })),
      wagerRequirement: wagerReq,
      wagered:
        status === "COMPLETED"
          ? wagerReq
          : parseFloat(faker.finance.amount({ min: 0, max: wagerReq, dec: 2 })),
      expiresAt: Math.random() > 0.3 ? faker.date.future({ years: 1 }) : null,
      createdAt: faker.date.recent({ days: 180 }),
    };
  });
  await prisma.bonus.createMany({ data: bonusData });

  // 9. KYC Documents (200)
  console.log("Creating 200 KYC documents...");
  const docTypes: Array<
    | "PASSPORT"
    | "DRIVERS_LICENSE"
    | "NATIONAL_ID"
    | "PROOF_OF_ADDRESS"
    | "BANK_STATEMENT"
    | "SELFIE"
  > = [
    "PASSPORT",
    "DRIVERS_LICENSE",
    "NATIONAL_ID",
    "PROOF_OF_ADDRESS",
    "BANK_STATEMENT",
    "SELFIE",
  ];
  const kycStatuses: Array<"PENDING" | "APPROVED" | "REJECTED"> = [
    "PENDING",
    "PENDING",
    "APPROVED",
    "APPROVED",
    "APPROVED",
    "REJECTED",
  ];
  const kycData = Array.from({ length: 200 }, () => {
    const status = faker.helpers.arrayElement(kycStatuses);
    return {
      userId: faker.helpers.arrayElement(userIds),
      docType: faker.helpers.arrayElement(docTypes),
      status,
      fileUrl: `/uploads/kyc/${faker.string.uuid()}.pdf`,
      reviewedBy: status !== "PENDING" ? faker.helpers.arrayElement(adminIds) : null,
      rejectionReason:
        status === "REJECTED"
          ? faker.helpers.arrayElement([
              "Document expired",
              "Poor image quality",
              "Name mismatch",
              "Document not accepted",
              "Illegible",
            ])
          : null,
      createdAt: faker.date.recent({ days: 120 }),
    };
  });
  await prisma.kYCDocument.createMany({ data: kycData });

  // 10. Admin Notes (100)
  console.log("Creating 100 admin notes...");
  const noteData = Array.from({ length: 100 }, () => ({
    userId: faker.helpers.arrayElement(userIds),
    authorId: faker.helpers.arrayElement(adminIds),
    content: faker.helpers.arrayElement([
      "Player contacted support about withdrawal delay.",
      "Verified ID documents manually - all checks passed.",
      "Suspicious betting pattern detected, escalated to compliance.",
      "VIP upgrade approved by management.",
      "Player self-excluded for 6 months.",
      "Bonus abuse investigation - cleared after review.",
      "AML flag raised due to large deposit from unverified source.",
      "Player requested account closure, processed per GDPR.",
      "Loyalty tier upgraded based on wagering volume.",
      "Chargeback received, account under review.",
    ]),
    isPinned: Math.random() > 0.85,
    createdAt: faker.date.recent({ days: 180 }),
  }));
  await prisma.adminNote.createMany({ data: noteData });

  // 11. Audit Logs (500)
  console.log("Creating 500 audit logs...");
  const auditActions: Array<
    | "USER_STATUS_CHANGE"
    | "BALANCE_ADJUSTMENT"
    | "BONUS_GRANT"
    | "KYC_APPROVE"
    | "KYC_REJECT"
    | "TRANSACTION_APPROVE"
    | "GAME_TOGGLE"
    | "NOTE_CREATE"
    | "RISK_FLAG"
  > = [
    "USER_STATUS_CHANGE",
    "BALANCE_ADJUSTMENT",
    "BONUS_GRANT",
    "KYC_APPROVE",
    "KYC_REJECT",
    "TRANSACTION_APPROVE",
    "GAME_TOGGLE",
    "NOTE_CREATE",
    "RISK_FLAG",
  ];
  const auditData = Array.from({ length: 500 }, () => {
    const action = faker.helpers.arrayElement(auditActions);
    return {
      adminId: faker.helpers.arrayElement(adminIds),
      action,
      targetType:
        action.startsWith("USER") || action === "BALANCE_ADJUSTMENT" || action === "RISK_FLAG"
          ? "User"
          : action.startsWith("KYC")
            ? "KYCDocument"
            : action === "GAME_TOGGLE"
              ? "Game"
              : "Bonus",
      targetId: faker.helpers.arrayElement(userIds),
      before: JSON.stringify({ status: "ACTIVE" }),
      after: JSON.stringify({
        status: faker.helpers.arrayElement(["SUSPENDED", "BANNED", "ACTIVE"]),
      }),
      ipAddress: faker.internet.ipv4(),
      createdAt: faker.date.recent({ days: 180 }),
    };
  });
  await prisma.auditLog.createMany({ data: auditData });

  console.log("Seeding complete!");
  console.log("Admin login: admin@slotsone.com / admin123");
  console.log("Superadmin login: superadmin@slotsone.com / admin123");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
