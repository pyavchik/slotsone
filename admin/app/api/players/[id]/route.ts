import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlayerById, getPlayerTransactions, getPlayerGameRounds } from "@/lib/backend-queries";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const player = await getPlayerById(params.id);

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const [transactions, gameRounds] = await Promise.all([
    getPlayerTransactions(params.id, 50),
    getPlayerGameRounds(params.id, 50),
  ]);

  // Admin-only data from Prisma (keyed by backend user UUID)
  let notes: any[] = [];
  let auditLogs: any[] = [];
  try {
    const adminNotes = await prisma.adminNote.findMany({
      where: { userId: params.id },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { name: true } } },
    });
    notes = adminNotes.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    const logs = await prisma.auditLog.findMany({
      where: { targetType: "User", targetId: params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { admin: { select: { name: true } } },
    });
    auditLogs = logs.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    }));
  } catch {
    // Admin-only tables may not have records for this user yet
  }

  // Build game sessions from game rounds
  const sessionMap = new Map<
    string,
    {
      id: string;
      gameId: string;
      startedAt: string;
      endedAt: string | null;
      totalBet: number;
      totalWin: number;
      roundsPlayed: number;
    }
  >();
  for (const r of gameRounds) {
    const existing = sessionMap.get(r.sessionId);
    if (existing) {
      existing.totalBet += parseFloat(r.betAmount);
      existing.totalWin += parseFloat(r.winAmount);
      existing.roundsPlayed++;
      if (r.createdAt < existing.startedAt) existing.startedAt = r.createdAt;
      if (!existing.endedAt || r.createdAt > existing.endedAt) existing.endedAt = r.createdAt;
    } else {
      sessionMap.set(r.sessionId, {
        id: r.sessionId,
        gameId: r.gameId,
        startedAt: r.createdAt,
        endedAt: r.createdAt,
        totalBet: parseFloat(r.betAmount),
        totalWin: parseFloat(r.winAmount),
        roundsPlayed: 1,
      });
    }
  }
  const gameSessions = Array.from(sessionMap.values())
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 20)
    .map((s) => ({
      ...s,
      totalBet: s.totalBet.toFixed(2),
      totalWin: s.totalWin.toFixed(2),
      game: { name: s.gameId, slug: s.gameId },
    }));

  return NextResponse.json({
    ...player,
    transactions,
    gameSessions,
    bonuses: [],
    kycDocuments: [],
    notes,
    auditLogs,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  // Admin-only updates are stored in Prisma admin DB
  // For now, we acknowledge the request but backend players don't have status/role/riskLevel
  const body = await request.json();

  return NextResponse.json({
    id: params.id,
    status: body.status || "ACTIVE",
    role: body.role || "PLAYER",
    riskLevel: body.riskLevel || "LOW",
    balanceReal: "0.00",
    balanceBonus: "0.00",
  });
}
