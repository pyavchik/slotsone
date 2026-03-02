export const dynamic = "force-dynamic";

import { getDashboardKPIs } from "@/lib/backend-queries";
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

export default async function DashboardPage() {
  const kpis = await getDashboardKPIs();

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
            <CardTitle className="text-sm font-medium">Total Bets</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.betTotal)}</div>
            <p className="text-xs text-muted-foreground">Total wagered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Wins</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.winTotal)}</div>
            <p className="text-xs text-muted-foreground">Paid out to players</p>
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
