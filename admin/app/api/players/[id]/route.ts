import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      gameSessions: {
        orderBy: { startedAt: "desc" },
        take: 20,
        include: { game: { select: { name: true, slug: true } } },
      },
      bonuses: {
        orderBy: { createdAt: "desc" },
        include: { promotion: { select: { name: true } } },
      },
      kycDocuments: {
        orderBy: { createdAt: "desc" },
      },
      notes: {
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Get audit logs for this user
  const auditLogs = await prisma.auditLog.findMany({
    where: { targetType: "User", targetId: params.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { admin: { select: { name: true } } },
  });

  const serialized = {
    ...user,
    balanceReal: user.balanceReal.toFixed(2),
    balanceBonus: user.balanceBonus.toFixed(2),
    totalDeposited: user.totalDeposited.toFixed(2),
    totalWithdrawn: user.totalWithdrawn.toFixed(2),
    totalWagered: user.totalWagered.toFixed(2),
    totalWon: user.totalWon.toFixed(2),
    registeredAt: user.registeredAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    transactions: user.transactions.map((t) => ({
      ...t,
      amount: t.amount.toFixed(2),
      balanceBefore: t.balanceBefore.toFixed(2),
      balanceAfter: t.balanceAfter.toFixed(2),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
    gameSessions: user.gameSessions.map((s) => ({
      ...s,
      totalBet: s.totalBet.toFixed(2),
      totalWin: s.totalWin.toFixed(2),
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() || null,
    })),
    bonuses: user.bonuses.map((b) => ({
      ...b,
      amount: b.amount.toFixed(2),
      wagerRequirement: b.wagerRequirement.toFixed(2),
      wagered: b.wagered.toFixed(2),
      expiresAt: b.expiresAt?.toISOString() || null,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
    kycDocuments: user.kycDocuments.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    notes: user.notes.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
    auditLogs: auditLogs.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  };

  return NextResponse.json(serialized);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { status, role, riskLevel, balanceAdjustment } = body;

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const updates: any = {};
  if (status) updates.status = status;
  if (role) updates.role = role;
  if (riskLevel) updates.riskLevel = riskLevel;
  if (balanceAdjustment !== undefined) {
    const adj = parseFloat(balanceAdjustment);
    updates.balanceReal = { increment: adj };
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: updates,
  });

  return NextResponse.json({
    ...updated,
    balanceReal: updated.balanceReal.toFixed(2),
    balanceBonus: updated.balanceBonus.toFixed(2),
  });
}
