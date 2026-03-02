"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_COLORS, RISK_COLORS } from "@/lib/constants";
import { Search, Download, X } from "lucide-react";

interface Player {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  role: string;
  balanceReal: string;
  balanceBonus: string;
  currency: string;
  country: string | null;
  kycVerified: boolean;
  riskLevel: string;
  totalDeposited: string;
  totalWithdrawn: string;
  totalWagered: string;
  totalWon: string;
  registeredAt: string;
  lastLoginAt: string | null;
}

const columns: ColumnDef<Player, any>[] = [
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge className={STATUS_COLORS[row.original.status] || ""} variant="outline">
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "balanceReal",
    header: "Balance",
    cell: ({ row }) => (
      <div className="text-right font-mono">
        <div>{formatCurrency(row.original.balanceReal)}</div>
        {parseFloat(row.original.balanceBonus) > 0 && (
          <div className="text-xs text-purple-600">
            +{formatCurrency(row.original.balanceBonus)} bonus
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "riskLevel",
    header: "Risk",
    cell: ({ row }) => (
      <Badge className={RISK_COLORS[row.original.riskLevel] || ""} variant="outline">
        {row.original.riskLevel}
      </Badge>
    ),
  },
  {
    accessorKey: "kycVerified",
    header: "KYC",
    cell: ({ row }) => (
      <Badge variant={row.original.kycVerified ? "default" : "secondary"}>
        {row.original.kycVerified ? "Verified" : "Pending"}
      </Badge>
    ),
  },
  {
    accessorKey: "country",
    header: "Country",
    cell: ({ row }) => row.original.country || "—",
  },
  {
    accessorKey: "totalWagered",
    header: "Wagered",
    cell: ({ row }) => (
      <span className="font-mono">{formatCurrency(row.original.totalWagered)}</span>
    ),
  },
  {
    accessorKey: "registeredAt",
    header: "Registered",
    cell: ({ row }) => formatDate(row.original.registeredAt),
  },
];

export default function PlayersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [kycVerified, setKycVerified] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "registeredAt", desc: true }]);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", "25");
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (riskLevel) params.set("riskLevel", riskLevel);
  if (kycVerified) params.set("kycVerified", kycVerified);
  if (sorting.length > 0) {
    params.set("sortBy", sorting[0].id);
    params.set("sortDir", sorting[0].desc ? "desc" : "asc");
  }

  const { data, isLoading } = useQuery({
    queryKey: ["players", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/admin/api/players?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch players");
      return res.json();
    },
  });

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const clearFilters = () => {
    setSearch("");
    setSearchInput("");
    setStatus("");
    setRiskLevel("");
    setKycVerified("");
    setPage(1);
  };

  const hasFilters = search || status || riskLevel || kycVerified;

  const exportCSV = () => {
    const csvParams = new URLSearchParams(params);
    csvParams.set("pageSize", "10000");
    csvParams.set("page", "1");
    window.open(`/admin/api/players/export?${csvParams.toString()}`, "_blank");
  };

  // Make rows clickable to go to player detail
  const clickableColumns: ColumnDef<Player, any>[] = columns.map((col) => ({
    ...col,
    cell: (props: any) => (
      <div
        className="cursor-pointer"
        onClick={() => router.push(`/admin/players/${props.row.original.id}`)}
      >
        {(col as any).cell ? (col as any).cell(props) : props.getValue()}
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Players</h1>
          <p className="text-muted-foreground">Manage player accounts and view activity</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-1 min-w-[200px] gap-2">
              <Input
                placeholder="Search by name, email, username..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} size="icon" variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </div>
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
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="BANNED">Banned</SelectItem>
                <SelectItem value="SELF_EXCLUDED">Self-Excluded</SelectItem>
                <SelectItem value="PENDING_VERIFICATION">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={riskLevel}
              onValueChange={(v) => {
                setRiskLevel(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Risks</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={kycVerified}
              onValueChange={(v) => {
                setKycVerified(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="KYC Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All KYC</SelectItem>
                <SelectItem value="true">Verified</SelectItem>
                <SelectItem value="false">Unverified</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} size="sm">
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">Loading players...</div>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={clickableColumns}
          data={data?.data || []}
          pageCount={data?.pagination?.totalPages || 1}
          page={page}
          pageSize={25}
          total={data?.pagination?.total || 0}
          onPageChange={setPage}
          sorting={sorting}
          onSortingChange={setSorting}
        />
      )}
    </div>
  );
}
