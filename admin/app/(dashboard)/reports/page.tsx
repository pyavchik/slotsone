"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { TRANSACTION_TYPE_COLORS } from "@/lib/constants";
import { Download } from "lucide-react";

export default function ReportsPage() {
  const [tab, setTab] = useState("financial");
  const [period, setPeriod] = useState("30");

  const { data, isLoading } = useQuery({
    queryKey: ["reports", tab, period],
    queryFn: async () => {
      const res = await fetch(`/admin/api/reports?report=${tab}&period=${period}`);
      return res.json();
    },
  });

  const exportCSV = (rows: any[], filename: string) => {
    if (!rows?.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => `"${r[k]}"`).join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Financial, player, and game performance reports</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data?.summary?.map((s: any) => (
                  <Card key={s.type}>
                    <CardContent className="pt-6">
                      <div
                        className={`text-sm font-medium ${TRANSACTION_TYPE_COLORS[s.type] || ""}`}
                      >
                        {s.type}
                      </div>
                      <div className="text-2xl font-bold mt-1">{formatCurrency(s.total)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatNumber(s.count)} transactions
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Daily Breakdown</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportCSV(data?.daily, "financial-report")}
                  >
                    <Download className="mr-2 h-4 w-4" /> Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                            Date
                          </th>
                          <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                            Type
                          </th>
                          <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                            Total
                          </th>
                          <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                            Count
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data?.daily?.map((d: any, i: number) => (
                          <tr key={i} className="border-b">
                            <td className="p-4">{d.date}</td>
                            <td className="p-4">
                              <span className={TRANSACTION_TYPE_COLORS[d.type]}>{d.type}</span>
                            </td>
                            <td className="p-4 text-right font-mono">{formatCurrency(d.total)}</td>
                            <td className="p-4 text-right">{d.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="players" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Player Registration Trend</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportCSV(data?.newPlayers, "player-registrations")}
                    >
                      <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="relative w-full overflow-auto max-h-[300px]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                              Date
                            </th>
                            <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                              New Players
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {data?.newPlayers?.map((d: any) => (
                            <tr key={d.date} className="border-b">
                              <td className="p-4">{d.date}</td>
                              <td className="p-4 text-right font-mono">{d.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data?.statusBreakdown?.map((s: any) => (
                        <div key={s.status} className="flex items-center justify-between">
                          <Badge variant="outline">{s.status}</Badge>
                          <span className="font-mono">{formatNumber(s.count)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Top Countries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                    {data?.countryBreakdown?.map((c: any) => (
                      <div
                        key={c.country}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <span className="text-sm">{c.country}</span>
                        <span className="font-mono text-sm font-medium">
                          {formatNumber(c.count)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="games" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Game Performance</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportCSV(data?.games, "game-performance")}
                >
                  <Download className="mr-2 h-4 w-4" /> Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="relative w-full overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                          Game
                        </th>
                        <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                          Provider
                        </th>
                        <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                          Category
                        </th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                          RTP
                        </th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                          Rounds
                        </th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                          Total Bets
                        </th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                          GGR
                        </th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">
                          Margin
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.games?.map((g: any) => (
                        <tr key={g.gameId} className="border-b">
                          <td className="p-4 font-medium">{g.name}</td>
                          <td className="p-4 text-muted-foreground">{g.provider}</td>
                          <td className="p-4">
                            <Badge variant="outline">{g.category}</Badge>
                          </td>
                          <td className="p-4 text-right">{g.rtp}%</td>
                          <td className="p-4 text-right font-mono">{formatNumber(g.rounds)}</td>
                          <td className="p-4 text-right font-mono">
                            {formatCurrency(g.totalBets)}
                          </td>
                          <td className="p-4 text-right font-mono">{formatCurrency(g.ggr)}</td>
                          <td className="p-4 text-right">{g.margin}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
