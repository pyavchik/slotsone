import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "25")));
  const tab = sp.get("tab") || "flagged";

  if (tab === "flagged") {
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where: { riskLevel: { in: ["HIGH", "CRITICAL"] } },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where: { riskLevel: { in: ["HIGH", "CRITICAL"] } } }),
    ]);
    return NextResponse.json({
      data: data.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        status: u.status,
        riskLevel: u.riskLevel,
        kycVerified: u.kycVerified,
        country: u.country,
        balanceReal: u.balanceReal.toFixed(2),
        totalDeposited: u.totalDeposited.toFixed(2),
        totalWithdrawn: u.totalWithdrawn.toFixed(2),
        totalWagered: u.totalWagered.toFixed(2),
        registeredAt: u.registeredAt.toISOString(),
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  }

  if (tab === "aml") {
    // Large transactions that may trigger AML alerts
    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          OR: [
            { type: "DEPOSIT", amount: { gte: 5000 } },
            { type: "WITHDRAWAL", amount: { gte: 3000 } },
          ],
          status: "COMPLETED",
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { username: true, email: true, riskLevel: true, kycVerified: true } },
        },
      }),
      prisma.transaction.count({
        where: {
          OR: [
            { type: "DEPOSIT", amount: { gte: 5000 } },
            { type: "WITHDRAWAL", amount: { gte: 3000 } },
          ],
          status: "COMPLETED",
        },
      }),
    ]);
    return NextResponse.json({
      data: data.map((t) => ({
        id: t.id,
        userId: t.userId,
        username: t.user.username,
        email: t.user.email,
        riskLevel: t.user.riskLevel,
        kycVerified: t.user.kycVerified,
        type: t.type,
        amount: t.amount.toFixed(2),
        createdAt: t.createdAt.toISOString(),
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  }

  // Duplicate detection: users with same email domain and similar registration times
  if (tab === "duplicates") {
    const duplicates = (await prisma.$queryRaw`
      SELECT u1.id, u1.username, u1.email, u1.country, u1."registeredAt",
             u1."balanceReal", u1."riskLevel",
             COUNT(*) OVER (PARTITION BY SPLIT_PART(u1.email, '@', 2)) as domain_count
      FROM users u1
      WHERE (
        SELECT COUNT(*) FROM users u2
        WHERE SPLIT_PART(u2.email, '@', 2) = SPLIT_PART(u1.email, '@', 2)
      ) > 1
      ORDER BY SPLIT_PART(u1.email, '@', 2), u1."registeredAt" DESC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `) as any[];

    return NextResponse.json({
      data: duplicates.map((u) => ({
        ...u,
        balanceReal: Number(u.balanceReal).toFixed(2),
        registeredAt: new Date(u.registeredAt).toISOString(),
      })),
      pagination: { page, pageSize, total: duplicates.length, totalPages: 1 },
    });
  }

  return NextResponse.json({ data: [], pagination: { page, pageSize, total: 0, totalPages: 0 } });
}
