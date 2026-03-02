"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_COLORS, RISK_COLORS, TRANSACTION_TYPE_COLORS } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;

  const { data: player, isLoading } = useQuery({
    queryKey: ["player", playerId],
    queryFn: async () => {
      const res = await fetch(`/admin/api/players/${playerId}`);
      if (!res.ok) throw new Error("Failed to fetch player");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">Loading player...</div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">Player not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/players")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{player.username}</h1>
            <Badge className={STATUS_COLORS[player.status]} variant="outline">
              {player.status}
            </Badge>
            <Badge className={RISK_COLORS[player.riskLevel]} variant="outline">
              {player.riskLevel}
            </Badge>
            <Badge variant={player.kycVerified ? "default" : "secondary"}>
              {player.kycVerified ? "KYC Verified" : "KYC Pending"}
            </Badge>
            <Badge variant="outline">{player.role}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {player.email} {player.country ? `· ${player.country}` : ""} · Registered{" "}
            {formatDate(player.registeredAt)}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Real Balance</div>
            <div className="text-2xl font-bold">{formatCurrency(player.balanceReal)}</div>
            {parseFloat(player.balanceBonus) > 0 && (
              <div className="text-sm text-purple-600">
                +{formatCurrency(player.balanceBonus)} bonus
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Deposited</div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(player.totalDeposited)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Wagered</div>
            <div className="text-2xl font-bold">{formatCurrency(player.totalWagered)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Net P&L</div>
            <div
              className={`text-2xl font-bold ${parseFloat(player.totalWon) - parseFloat(player.totalWagered) >= 0 ? "text-emerald-600" : "text-red-600"}`}
            >
              {formatCurrency(parseFloat(player.totalWon) - parseFloat(player.totalWagered))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">
            Transactions ({player.transactions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="sessions">
            Game History ({player.gameSessions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="bonuses">Bonuses ({player.bonuses?.length || 0})</TabsTrigger>
          <TabsTrigger value="kyc">KYC ({player.kycDocuments?.length || 0})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({player.notes?.length || 0})</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="audit">Audit ({player.auditLogs?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="User ID" value={player.id} />
                <DetailRow label="Email" value={player.email} />
                <DetailRow label="Username" value={player.username} />
                <DetailRow
                  label="Name"
                  value={[player.firstName, player.lastName].filter(Boolean).join(" ") || "—"}
                />
                <DetailRow label="Country" value={player.country || "—"} />
                <DetailRow label="Currency" value={player.currency} />
                <DetailRow label="Role" value={player.role} />
                <DetailRow
                  label="Last Login"
                  value={player.lastLoginAt ? formatDate(player.lastLoginAt) : "Never"}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Total Deposited" value={formatCurrency(player.totalDeposited)} />
                <DetailRow label="Total Withdrawn" value={formatCurrency(player.totalWithdrawn)} />
                <DetailRow label="Total Wagered" value={formatCurrency(player.totalWagered)} />
                <DetailRow label="Total Won" value={formatCurrency(player.totalWon)} />
                <Separator />
                <DetailRow
                  label="GGR"
                  value={formatCurrency(
                    parseFloat(player.totalWagered) - parseFloat(player.totalWon)
                  )}
                />
                <DetailRow
                  label="Deposit/Withdrawal Ratio"
                  value={
                    parseFloat(player.totalWithdrawn) > 0
                      ? (
                          parseFloat(player.totalDeposited) / parseFloat(player.totalWithdrawn)
                        ).toFixed(2)
                      : "N/A"
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardContent className="pt-6">
              <div className="relative w-full overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                        Amount
                      </th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                        Balance After
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Description
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.transactions?.map((tx: any) => (
                      <tr key={tx.id} className="border-b">
                        <td className="p-4">
                          <span className={TRANSACTION_TYPE_COLORS[tx.type] || ""}>{tx.type}</span>
                        </td>
                        <td className="p-4 text-right font-mono">{formatCurrency(tx.amount)}</td>
                        <td className="p-4 text-right font-mono text-muted-foreground">
                          {formatCurrency(tx.balanceAfter)}
                        </td>
                        <td className="p-4">
                          <Badge className={STATUS_COLORS[tx.status]} variant="outline">
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground">{tx.description || "—"}</td>
                        <td className="p-4 text-muted-foreground">{formatDate(tx.createdAt)}</td>
                      </tr>
                    ))}
                    {(!player.transactions || player.transactions.length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No transactions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Game History Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardContent className="pt-6">
              <div className="relative w-full overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Game
                      </th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                        Total Bet
                      </th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                        Total Win
                      </th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                        P&L
                      </th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                        Rounds
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Started
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.gameSessions?.map((s: any) => {
                      const pl = parseFloat(s.totalWin) - parseFloat(s.totalBet);
                      return (
                        <tr key={s.id} className="border-b">
                          <td className="p-4 font-medium">{s.game?.name || s.gameId}</td>
                          <td className="p-4 text-right font-mono">{formatCurrency(s.totalBet)}</td>
                          <td className="p-4 text-right font-mono">{formatCurrency(s.totalWin)}</td>
                          <td
                            className={`p-4 text-right font-mono ${pl >= 0 ? "text-emerald-600" : "text-red-600"}`}
                          >
                            {formatCurrency(pl)}
                          </td>
                          <td className="p-4 text-right">{s.roundsPlayed}</td>
                          <td className="p-4 text-muted-foreground">{formatDate(s.startedAt)}</td>
                        </tr>
                      );
                    })}
                    {(!player.gameSessions || player.gameSessions.length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No game sessions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bonuses Tab */}
        <TabsContent value="bonuses">
          <Card>
            <CardContent className="pt-6">
              <div className="relative w-full overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                        Amount
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Promotion
                      </th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                        Wagered / Required
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Expires
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.bonuses?.map((b: any) => (
                      <tr key={b.id} className="border-b">
                        <td className="p-4">{b.type}</td>
                        <td className="p-4 text-right font-mono">{formatCurrency(b.amount)}</td>
                        <td className="p-4">
                          <Badge className={STATUS_COLORS[b.status]} variant="outline">
                            {b.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground">{b.promotion?.name || "—"}</td>
                        <td className="p-4 text-right font-mono">
                          {formatCurrency(b.wagered)} / {formatCurrency(b.wagerRequirement)}
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {b.expiresAt ? formatDate(b.expiresAt) : "—"}
                        </td>
                      </tr>
                    ))}
                    {(!player.bonuses || player.bonuses.length === 0) && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No bonuses
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KYC Tab */}
        <TabsContent value="kyc">
          <Card>
            <CardContent className="pt-6">
              <div className="relative w-full overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Document Type
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Rejection Reason
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.kycDocuments?.map((d: any) => (
                      <tr key={d.id} className="border-b">
                        <td className="p-4 font-medium">{d.docType.replace(/_/g, " ")}</td>
                        <td className="p-4">
                          <Badge className={STATUS_COLORS[d.status]} variant="outline">
                            {d.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-muted-foreground">{d.rejectionReason || "—"}</td>
                        <td className="p-4 text-muted-foreground">{formatDate(d.createdAt)}</td>
                      </tr>
                    ))}
                    {(!player.kycDocuments || player.kycDocuments.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          No KYC documents
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {player.notes?.map((n: any) => (
                <div
                  key={n.id}
                  className={`rounded-lg border p-4 ${n.isPinned ? "border-amber-300 bg-amber-50/50" : ""}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{n.author?.name}</span>
                      {n.isPinned && (
                        <Badge variant="outline" className="text-[10px]">
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
                  </div>
                  <p className="text-sm">{n.content}</p>
                </div>
              ))}
              {(!player.notes || player.notes.length === 0) && (
                <div className="text-center text-muted-foreground py-8">No notes</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Risk Level" value={player.riskLevel} />
                <DetailRow label="KYC Verified" value={player.kycVerified ? "Yes" : "No"} />
                <DetailRow label="Account Status" value={player.status} />
                <Separator />
                <DetailRow label="Total Deposited" value={formatCurrency(player.totalDeposited)} />
                <DetailRow label="Total Withdrawn" value={formatCurrency(player.totalWithdrawn)} />
                <DetailRow
                  label="Deposit/Withdrawal Ratio"
                  value={
                    parseFloat(player.totalWithdrawn) > 0
                      ? (
                          parseFloat(player.totalDeposited) / parseFloat(player.totalWithdrawn)
                        ).toFixed(2) + "x"
                      : "N/A"
                  }
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Risk Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <RiskIndicator
                  label="Large single deposit (>5000)"
                  active={parseFloat(player.totalDeposited) > 5000}
                />
                <RiskIndicator
                  label="High wagering volume"
                  active={parseFloat(player.totalWagered) > 50000}
                />
                <RiskIndicator
                  label="Withdrawal exceeds deposits"
                  active={parseFloat(player.totalWithdrawn) > parseFloat(player.totalDeposited)}
                />
                <RiskIndicator label="Unverified KYC" active={!player.kycVerified} />
                <RiskIndicator
                  label="Multiple risk flags"
                  active={player.riskLevel === "HIGH" || player.riskLevel === "CRITICAL"}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <Card>
            <CardContent className="pt-6">
              <div className="relative w-full overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Action
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Admin
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Details
                      </th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.auditLogs?.map((a: any) => (
                      <tr key={a.id} className="border-b">
                        <td className="p-4">
                          <Badge variant="outline">{a.action}</Badge>
                        </td>
                        <td className="p-4">{a.admin?.name}</td>
                        <td className="p-4 text-muted-foreground text-xs font-mono max-w-[300px] truncate">
                          {a.after ? JSON.stringify(a.after).slice(0, 100) : "—"}
                        </td>
                        <td className="p-4 text-muted-foreground">{formatDate(a.createdAt)}</td>
                      </tr>
                    ))}
                    {(!player.auditLogs || player.auditLogs.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          No audit logs
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function RiskIndicator({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${active ? "bg-red-500" : "bg-emerald-500"}`} />
      <span className={`text-sm ${active ? "text-red-700 font-medium" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}
