import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const report = sp.get("report") || "financial";
  const period = sp.get("period") || "30";
  const days = parseInt(period);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  if (report === "financial") {
    const summary = await prisma.transaction.groupBy({
      by: ["type"],
      where: { createdAt: { gte: startDate }, status: "COMPLETED" },
      _sum: { amount: true },
      _count: true,
    });

    const daily = (await prisma.$queryRaw`
      SELECT
        DATE("createdAt") as date,
        type,
        SUM(amount) as total,
        COUNT(*)::int as count
      FROM transactions
      WHERE "createdAt" >= ${startDate} AND status = 'COMPLETED'
      GROUP BY DATE("createdAt"), type
      ORDER BY date ASC
    `) as any[];

    return NextResponse.json({
      summary: summary.map((s) => ({
        type: s.type,
        total: Number(s._sum.amount || 0).toFixed(2),
        count: s._count,
      })),
      daily: daily.map((d) => ({
        date: new Date(d.date).toISOString().split("T")[0],
        type: d.type,
        total: Number(d.total).toFixed(2),
        count: d.count,
      })),
    });
  }

  if (report === "players") {
    const [newPlayers, statusBreakdown, countryBreakdown] = await Promise.all([
      prisma.$queryRaw`
        SELECT DATE("registeredAt") as date, COUNT(*)::int as count
        FROM users
        WHERE "registeredAt" >= ${startDate}
        GROUP BY DATE("registeredAt")
        ORDER BY date ASC
      ` as Promise<any[]>,
      prisma.user.groupBy({ by: ["status"], _count: true }),
      prisma.user.groupBy({
        by: ["country"],
        _count: true,
        orderBy: { _count: { country: "desc" } },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      newPlayers: newPlayers.map((d) => ({
        date: new Date(d.date).toISOString().split("T")[0],
        count: d.count,
      })),
      statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count })),
      countryBreakdown: countryBreakdown.map((c) => ({
        country: c.country || "Unknown",
        count: c._count,
      })),
    });
  }

  if (report === "games") {
    const gameStats = await prisma.gameRound.groupBy({
      by: ["gameId"],
      where: { createdAt: { gte: startDate } },
      _sum: { betAmount: true, winAmount: true },
      _count: true,
      orderBy: { _sum: { betAmount: "desc" } },
      take: 50,
    });

    const gameIds = gameStats.map((g) => g.gameId);
    const games = await prisma.game.findMany({
      where: { id: { in: gameIds } },
      select: { id: true, name: true, provider: true, category: true, rtp: true },
    });
    const gameMap = new Map(games.map((g) => [g.id, g]));

    return NextResponse.json({
      games: gameStats.map((gs) => {
        const game = gameMap.get(gs.gameId);
        const bets = Number(gs._sum.betAmount || 0);
        const wins = Number(gs._sum.winAmount || 0);
        return {
          gameId: gs.gameId,
          name: game?.name || gs.gameId,
          provider: game?.provider || "—",
          category: game?.category || "—",
          rtp: game?.rtp?.toFixed(2) || "—",
          rounds: gs._count,
          totalBets: bets.toFixed(2),
          totalWins: wins.toFixed(2),
          ggr: (bets - wins).toFixed(2),
          margin: bets > 0 ? (((bets - wins) / bets) * 100).toFixed(2) : "0.00",
        };
      }),
    });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
