"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { RISK_COLORS, STATUS_COLORS, TRANSACTION_TYPE_COLORS } from "@/lib/constants";
import { useRouter } from "next/navigation";

interface FlaggedPlayer {
  id: string;
  username: string;
  email: string;
  status: string;
  riskLevel: string;
  kycVerified: boolean;
  country: string | null;
  balanceReal: string;
  totalDeposited: string;
  totalWithdrawn: string;
  totalWagered: string;
  registeredAt: string;
}

interface AMLAlert {
  id: string;
  userId: string;
  username: string;
  email: string;
  riskLevel: string;
  kycVerified: boolean;
  type: string;
  amount: string;
  createdAt: string;
}

const flaggedColumns: ColumnDef<FlaggedPlayer, any>[] = [
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
    accessorKey: "riskLevel",
    header: "Risk",
    cell: ({ row }) => (
      <Badge className={RISK_COLORS[row.original.riskLevel]} variant="outline">
        {row.original.riskLevel}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge className={STATUS_COLORS[row.original.status]} variant="outline">
        {row.original.status}
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
    accessorKey: "balanceReal",
    header: "Balance",
    cell: ({ row }) => (
      <span className="font-mono">{formatCurrency(row.original.balanceReal)}</span>
    ),
  },
  {
    accessorKey: "totalDeposited",
    header: "Deposited",
    cell: ({ row }) => (
      <span className="font-mono">{formatCurrency(row.original.totalDeposited)}</span>
    ),
  },
  {
    accessorKey: "totalWagered",
    header: "Wagered",
    cell: ({ row }) => (
      <span className="font-mono">{formatCurrency(row.original.totalWagered)}</span>
    ),
  },
  { accessorKey: "country", header: "Country", cell: ({ row }) => row.original.country || "—" },
  {
    accessorKey: "registeredAt",
    header: "Registered",
    cell: ({ row }) => formatDate(row.original.registeredAt),
  },
];

const amlColumns: ColumnDef<AMLAlert, any>[] = [
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
      <span className={TRANSACTION_TYPE_COLORS[row.original.type]}>{row.original.type}</span>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="font-mono font-bold">{formatCurrency(row.original.amount)}</span>
    ),
  },
  {
    accessorKey: "riskLevel",
    header: "Risk",
    cell: ({ row }) => (
      <Badge className={RISK_COLORS[row.original.riskLevel]} variant="outline">
        {row.original.riskLevel}
      </Badge>
    ),
  },
  {
    accessorKey: "kycVerified",
    header: "KYC",
    cell: ({ row }) => (
      <Badge variant={row.original.kycVerified ? "default" : "secondary"}>
        {row.original.kycVerified ? "Yes" : "No"}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

export default function RiskPage() {
  const router = useRouter();
  const [tab, setTab] = useState("flagged");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", "25");
  params.set("tab", tab);

  const { data, isLoading } = useQuery({
    queryKey: ["risk", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/admin/api/risk?${params.toString()}`);
      return res.json();
    },
  });

  const clickableFlagged: ColumnDef<FlaggedPlayer, any>[] = flaggedColumns.map((col) => ({
    ...col,
    cell: (props: any) => (
      <div
        className="cursor-pointer"
        onClick={() => router.push(`/players/${props.row.original.id}`)}
      >
        {(col as any).cell ? (col as any).cell(props) : props.getValue()}
      </div>
    ),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Risk & Compliance</h1>
        <p className="text-muted-foreground">
          Monitor risk flags, AML alerts, and suspicious activity
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="flagged">Flagged Players</TabsTrigger>
          <TabsTrigger value="aml">AML Alerts</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicate Detection</TabsTrigger>
        </TabsList>

        <TabsContent value="flagged" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                Loading...
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={clickableFlagged}
              data={data?.data || []}
              pageCount={data?.pagination?.totalPages || 1}
              page={page}
              pageSize={25}
              total={data?.pagination?.total || 0}
              onPageChange={setPage}
            />
          )}
        </TabsContent>

        <TabsContent value="aml" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                Loading...
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={amlColumns}
              data={data?.data || []}
              pageCount={data?.pagination?.totalPages || 1}
              page={page}
              pageSize={25}
              total={data?.pagination?.total || 0}
              onPageChange={setPage}
            />
          )}
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                Loading...
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={[
                { accessorKey: "username", header: "Username" },
                { accessorKey: "email", header: "Email" },
                {
                  accessorKey: "country",
                  header: "Country",
                  cell: ({ row }: any) => row.original.country || "—",
                },
                {
                  accessorKey: "riskLevel",
                  header: "Risk",
                  cell: ({ row }: any) => (
                    <Badge className={RISK_COLORS[row.original.riskLevel]} variant="outline">
                      {row.original.riskLevel}
                    </Badge>
                  ),
                },
                {
                  accessorKey: "balanceReal",
                  header: "Balance",
                  cell: ({ row }: any) => (
                    <span className="font-mono">{formatCurrency(row.original.balanceReal)}</span>
                  ),
                },
                { accessorKey: "domain_count", header: "Shared Domain Users" },
                {
                  accessorKey: "registeredAt",
                  header: "Registered",
                  cell: ({ row }: any) => formatDate(row.original.registeredAt),
                },
              ]}
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
