"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Search, X, Star } from "lucide-react";

interface Game {
  id: string;
  slug: string;
  name: string;
  provider: string;
  category: string;
  rtp: string;
  isActive: boolean;
  isFeatured: boolean;
  minBet: string;
  maxBet: string;
  totalRounds: number;
  totalSessions: number;
  totalBets: string;
  totalWins: string;
  ggr: string;
  createdAt: string;
}

export default function GamesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("");

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", "25");
  if (search) params.set("search", search);
  if (category) params.set("category", category);

  const { data, isLoading } = useQuery({
    queryKey: ["games", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/admin/api/games?${params.toString()}`);
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (body: { id: string; isActive?: boolean; isFeatured?: boolean }) => {
      const res = await fetch("/admin/api/games", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["games"] }),
  });

  const columns: ColumnDef<Game, any>[] = [
    {
      accessorKey: "name",
      header: "Game",
      cell: ({ row }) => (
        <div>
          <div className="font-medium flex items-center gap-1">
            {row.original.name}
            {row.original.isFeatured && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.original.provider} · {row.original.slug}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
    },
    {
      accessorKey: "rtp",
      header: "RTP",
      cell: ({ row }) => `${row.original.rtp}%`,
    },
    {
      accessorKey: "totalRounds",
      header: "Rounds",
      cell: ({ row }) => row.original.totalRounds.toLocaleString(),
    },
    {
      accessorKey: "totalBets",
      header: "Total Bets",
      cell: ({ row }) => (
        <span className="font-mono">{formatCurrency(row.original.totalBets)}</span>
      ),
    },
    {
      accessorKey: "ggr",
      header: "GGR",
      cell: ({ row }) => {
        const ggr = parseFloat(row.original.ggr);
        return (
          <span className={`font-mono ${ggr >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCurrency(ggr)}
          </span>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Active",
      cell: ({ row }) => (
        <Switch
          checked={row.original.isActive}
          onCheckedChange={(checked) =>
            toggleMutation.mutate({ id: row.original.id, isActive: checked })
          }
        />
      ),
    },
    {
      accessorKey: "isFeatured",
      header: "Featured",
      cell: ({ row }) => (
        <Switch
          checked={row.original.isFeatured}
          onCheckedChange={(checked) =>
            toggleMutation.mutate({ id: row.original.id, isFeatured: checked })
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Games</h1>
        <p className="text-muted-foreground">Manage game catalog and monitor performance</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-1 min-w-[200px] gap-2">
              <Input
                placeholder="Search games..."
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
              value={category}
              onValueChange={(v) => {
                setCategory(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="SLOTS">Slots</SelectItem>
                <SelectItem value="TABLE">Table</SelectItem>
                <SelectItem value="LIVE">Live</SelectItem>
                <SelectItem value="INSTANT">Instant</SelectItem>
              </SelectContent>
            </Select>
            {(search || category) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSearchInput("");
                  setCategory("");
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
    </div>
  );
}
