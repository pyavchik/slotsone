export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { DashboardCharts } from "./dashboard-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

async function getKPIs() {
  const [
    totalPlayers,
    activePlayers,
    deposits,
    withdrawals,
    totalBets,
    totalWins,
    pendingKYC,
    highRiskPlayers,
    recentTransactions,
    topGames,
    dailyRevenue,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.transaction.aggregate({
      where: { type: "DEPOSIT", status: "COMPLETED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { type: "WITHDRAWAL", status: "COMPLETED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { type: "BET", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { type: "WIN", status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.kYCDocument.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { riskLevel: { in: ["HIGH", "CRITICAL"] } } }),
    prisma.transaction.findMany({
      where: { amount: { gte: 1000 } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { username: true, email: true } } },
    }),
    prisma.gameRound.groupBy({
      by: ["gameId"],
      _sum: { betAmount: true, winAmount: true },
      _count: true,
      orderBy: { _sum: { betAmount: "desc" } },
      take: 8,
    }),
    prisma.$queryRaw`
      SELECT
        DATE("createdAt") as date,
        SUM(CASE WHEN type = 'BET' THEN amount ELSE 0 END) as bets,
        SUM(CASE WHEN type = 'WIN' THEN amount ELSE 0 END) as wins,
        SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END) as deposits
      FROM transactions
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        AND status = 'COMPLETED'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
  ]);

  const depositTotal = Number(deposits._sum.amount || 0);
  const withdrawalTotal = Number(withdrawals._sum.amount || 0);
  const betTotal = Number(totalBets._sum.amount || 0);
  const winTotal = Number(totalWins._sum.amount || 0);
  const ggr = betTotal - winTotal;

  // Resolve game names for top games
  const gameIds = topGames.map((g) => g.gameId);
  const games = await prisma.game.findMany({
    where: { id: { in: gameIds } },
    select: { id: true, name: true },
  });
  const gameMap = new Map(games.map((g) => [g.id, g.name]));

  const topGamesWithNames = topGames.map((g) => ({
    name: gameMap.get(g.gameId) || g.gameId,
    bets: Number(g._sum.betAmount || 0),
    wins: Number(g._sum.winAmount || 0),
    rounds: g._count,
    ggr: Number(g._sum.betAmount || 0) - Number(g._sum.winAmount || 0),
  }));

  const revenueData = (dailyRevenue as any[]).map((row) => ({
    date: new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    bets: Number(row.bets),
    wins: Number(row.wins),
    deposits: Number(row.deposits),
    ggr: Number(row.bets) - Number(row.wins),
  }));

  return {
    totalPlayers,
    activePlayers,
    depositTotal,
    depositCount: deposits._count,
    withdrawalTotal,
    withdrawalCount: withdrawals._count,
    ggr,
    pendingKYC,
    highRiskPlayers,
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      username: t.user.username,
      type: t.type,
      amount: Number(t.amount),
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
    topGames: topGamesWithNames,
    revenueData,
  };
}

export default async function DashboardPage() {
  const kpis = await getKPIs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">iGaming platform overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(kpis.totalPlayers)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(kpis.activePlayers)} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.depositTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(kpis.depositCount)} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.withdrawalTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(kpis.withdrawalCount)} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GGR (Gross Gaming Revenue)</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.ggr)}</div>
            <p className="text-xs text-muted-foreground">Bets minus wins</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending KYC Reviews</CardTitle>
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{kpis.pendingKYC}</div>
            <p className="text-xs text-muted-foreground">Documents awaiting review</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Players</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{kpis.highRiskPlayers}</div>
            <p className="text-xs text-muted-foreground">Flagged for review</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <DashboardCharts revenueData={kpis.revenueData} topGames={kpis.topGames} />

      {/* Recent Large Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Large Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left font-medium text-muted-foreground">Player</th>
                  <th className="h-12 px-4 text-left font-medium text-muted-foreground">Type</th>
                  <th className="h-12 px-4 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="h-12 px-4 text-left font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-left font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {kpis.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b">
                    <td className="p-4 font-medium">{tx.username}</td>
                    <td className="p-4">
                      <Badge variant="outline">{tx.type}</Badge>
                    </td>
                    <td className="p-4 text-right font-mono">{formatCurrency(tx.amount)}</td>
                    <td className="p-4">
                      <Badge variant={tx.status === "COMPLETED" ? "default" : "secondary"}>
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {kpis.recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No large transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
