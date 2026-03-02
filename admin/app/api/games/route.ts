import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "25")));
  const search = sp.get("search") || "";
  const category = sp.get("category") || "";
  const provider = sp.get("provider") || "";
  const isActive = sp.get("isActive") || "";

  const where: Prisma.GameWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { provider: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category as any;
  if (provider && !search) where.provider = provider;
  if (isActive) where.isActive = isActive === "true";

  const [data, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { rounds: true, sessions: true } },
      },
    }),
    prisma.game.count({ where }),
  ]);

  // Get aggregate stats per game
  const gameIds = data.map((g) => g.id);
  const stats = await prisma.gameRound.groupBy({
    by: ["gameId"],
    where: { gameId: { in: gameIds } },
    _sum: { betAmount: true, winAmount: true },
    _count: true,
  });
  const statsMap = new Map(stats.map((s) => [s.gameId, s]));

  return NextResponse.json({
    data: data.map((g) => {
      const gs = statsMap.get(g.id);
      return {
        id: g.id,
        slug: g.slug,
        name: g.name,
        provider: g.provider,
        category: g.category,
        rtp: g.rtp.toFixed(2),
        isActive: g.isActive,
        isFeatured: g.isFeatured,
        minBet: g.minBet.toFixed(2),
        maxBet: g.maxBet.toFixed(2),
        totalRounds: gs?._count || 0,
        totalSessions: g._count.sessions,
        totalBets: gs?._sum.betAmount?.toFixed(2) || "0.00",
        totalWins: gs?._sum.winAmount?.toFixed(2) || "0.00",
        ggr: (Number(gs?._sum.betAmount || 0) - Number(gs?._sum.winAmount || 0)).toFixed(2),
        createdAt: g.createdAt.toISOString(),
      };
    }),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, isActive, isFeatured } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const updates: any = {};
  if (isActive !== undefined) updates.isActive = isActive;
  if (isFeatured !== undefined) updates.isFeatured = isFeatured;

  const game = await prisma.game.update({ where: { id }, data: updates });
  return NextResponse.json({ id: game.id, isActive: game.isActive, isFeatured: game.isFeatured });
}
