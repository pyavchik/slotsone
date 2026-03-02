"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RevenueData {
  date: string;
  bets: number;
  wins: number;
  deposits: number;
  ggr: number;
}

interface TopGame {
  name: string;
  bets: number;
  wins: number;
  rounds: number;
  ggr: number;
}

export function DashboardCharts({
  revenueData,
  topGames,
}: {
  revenueData: RevenueData[];
  topGames: TopGame[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Revenue (30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="ggr"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="GGR"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="deposits"
                  stroke="#16a34a"
                  strokeWidth={2}
                  name="Deposits"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="bets"
                  stroke="#f97316"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="Bets"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Games by Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topGames} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="bets" fill="#f97316" name="Bets" radius={[0, 4, 4, 0]} />
                <Bar dataKey="ggr" fill="#2563eb" name="GGR" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
