"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_COLORS, TRANSACTION_TYPE_COLORS } from "@/lib/constants";
import { Search, X, Check, Ban } from "lucide-react";

interface Transaction {
  id: string;
  userId: string;
  username: string;
  email: string;
  type: string;
  amount: string;
  status: string;
  balanceBefore: string;
  balanceAfter: string;
  currency: string;
  description: string | null;
  createdAt: string;
}

const columns: ColumnDef<Transaction, any>[] = [
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
    cell: ({ row }) => (
      <span className={`font-medium ${TRANSACTION_TYPE_COLORS[row.original.type] || ""}`}>
        {row.original.type}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => <span className="font-mono">{formatCurrency(row.original.amount)}</span>,
  },
  {
    accessorKey: "balanceAfter",
    header: "Balance After",
    cell: ({ row }) => (
      <span className="font-mono text-muted-foreground">
        {formatCurrency(row.original.balanceAfter)}
      </span>
    ),
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
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm max-w-[200px] truncate block">
        {row.original.description || "—"}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState("all");

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", "25");
  if (search) params.set("search", search);
  if (tab === "pending") {
    params.set("type", "WITHDRAWAL");
    params.set("status", "PENDING");
  } else {
    if (type) params.set("type", type);
    if (status) params.set("status", status);
  }

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/admin/api/transactions?${params.toString()}`);
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const res = await fetch("/admin/api/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const pendingColumns: ColumnDef<Transaction, any>[] = [
    ...columns,
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-emerald-600"
            onClick={() => approveMutation.mutate({ id: row.original.id, newStatus: "COMPLETED" })}
          >
            <Check className="mr-1 h-3 w-3" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600"
            onClick={() => approveMutation.mutate({ id: row.original.id, newStatus: "CANCELLED" })}
          >
            <Ban className="mr-1 h-3 w-3" /> Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">View and manage all financial transactions</p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="pending">Pending Withdrawals</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <div className="flex flex-1 min-w-[200px] gap-2">
                  <Input
                    placeholder="Search by player..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      (() => {
                        setSearch(searchInput);
                        setPage(1);
                      })()
                    }
                  />
                  <Button
                    onClick={() => {
                      setSearch(searchInput);
                      setPage(1);
                    }}
                    size="icon"
                    variant="secondary"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
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
                    <SelectItem value="DEPOSIT">Deposit</SelectItem>
                    <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                    <SelectItem value="BET">Bet</SelectItem>
                    <SelectItem value="WIN">Win</SelectItem>
                    <SelectItem value="BONUS_CREDIT">Bonus Credit</SelectItem>
                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                    <SelectItem value="REFUND">Refund</SelectItem>
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
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {(search || type || status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setSearchInput("");
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
                <div className="text-muted-foreground">Loading...</div>
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={columns}
              data={data?.data || []}
              pageCount={data?.pagination?.totalPages || 1}
              page={page}
              pageSize={25}
              total={data?.pagination?.total || 0}
              onPageChange={setPage}
            />
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-muted-foreground">Loading...</div>
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={pendingColumns}
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
