"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";
import { X } from "lucide-react";

interface BonusRow {
  id: string;
  userId: string;
  username: string;
  email: string;
  type: string;
  status: string;
  amount: string;
  wagerRequirement: string;
  wagered: string;
  promotionName: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface PromotionRow {
  id: string;
  name: string;
  description: string | null;
  type: string;
  amount: string;
  wagerRequirement: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
  bonusCount: number;
  redemptions: number;
  maxRedemptions: number | null;
}

const bonusColumns: ColumnDef<BonusRow, any>[] = [
  {
    accessorKey: "username",
    header: "Player",
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.username}</div>
        <div className="text-xs text-muted-foreground">{row.original.email}</div>
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge>,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <span className="font-mono">{formatCurrency(row.original.amount)}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge className={STATUS_COLORS[row.original.status] || ""} variant="outline">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "wagered",
    header: "Progress",
    cell: ({ row }) => {
      const wagered = parseFloat(row.original.wagered);
      const required = parseFloat(row.original.wagerRequirement);
      const pct = required > 0 ? Math.min(100, (wagered / required) * 100) : 100;
      return (
        <div className="space-y-1">
          <div className="text-xs font-mono">
            {formatCurrency(wagered)} / {formatCurrency(required)}
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "promotionName",
    header: "Promotion",
    cell: ({ row }) => row.original.promotionName || "\u2014",
  },
  {
    accessorKey: "expiresAt",
    header: "Expires",
    cell: ({ row }) => (row.original.expiresAt ? formatDate(row.original.expiresAt) : "\u2014"),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

const promotionColumns: ColumnDef<PromotionRow, any>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge>,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <span className="font-mono">{formatCurrency(row.original.amount)}</span>,
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    accessorKey: "redemptions",
    header: "Redemptions",
    cell: ({ row }) =>
      `${row.original.redemptions}${row.original.maxRedemptions ? ` / ${row.original.maxRedemptions}` : ""}`,
  },
  { accessorKey: "bonusCount", header: "Bonuses", cell: ({ row }) => row.original.bonusCount },
  {
    accessorKey: "startsAt",
    header: "Starts",
    cell: ({ row }) => formatDate(row.original.startsAt),
  },
  {
    accessorKey: "endsAt",
    header: "Ends",
    cell: ({ row }) => (row.original.endsAt ? formatDate(row.original.endsAt) : "\u2014"),
  },
];

export default function BonusesPage() {
  const [tab, setTab] = useState("bonuses");
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", "25");
  params.set("tab", tab);
  if (tab === "bonuses") {
    if (type) params.set("type", type);
    if (status) params.set("status", status);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["bonuses", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/admin/api/bonuses?${params.toString()}`);
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bonuses & Promotions</h1>
        <p className="text-muted-foreground">Manage player bonuses and promotional campaigns</p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="bonuses">Player Bonuses</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
        </TabsList>

        <TabsContent value="bonuses" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Select
                  value={type}
                  onValueChange={(v) => {
                    setType(v === "ALL" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="WELCOME">Welcome</SelectItem>
                    <SelectItem value="DEPOSIT_MATCH">Deposit Match</SelectItem>
                    <SelectItem value="FREE_SPINS">Free Spins</SelectItem>
                    <SelectItem value="CASHBACK">Cashback</SelectItem>
                    <SelectItem value="LOYALTY">Loyalty</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={status}
                  onValueChange={(v) => {
                    setStatus(v === "ALL" ? "" : v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="FORFEITED">Forfeited</SelectItem>
                  </SelectContent>
                </Select>
                {(type || status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setType("");
                      setStatus("");
                      setPage(1);
                    }}
                  >
                    <X className="mr-1 h-4 w-4" /> Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                Loading...
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={bonusColumns}
              data={data?.data || []}
              pageCount={data?.pagination?.totalPages || 1}
              page={page}
              pageSize={25}
              total={data?.pagination?.total || 0}
              onPageChange={setPage}
            />
          )}
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                Loading...
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={promotionColumns}
              data={data?.data || []}
              pageCount={data?.pagination?.totalPages || 1}
              page={page}
              pageSize={25}
              total={data?.pagination?.total || 0}
              onPageChange={setPage}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
