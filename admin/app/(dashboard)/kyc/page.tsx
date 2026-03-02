"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";
import { Check, Ban } from "lucide-react";

interface KYCRow {
  id: string;
  userId: string;
  username: string;
  email: string;
  country: string | null;
  docType: string;
  status: string;
  fileUrl: string;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export default function KYCPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [docTypeFilter, setDocTypeFilter] = useState("");
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", "25");
  if (statusFilter) params.set("status", statusFilter);
  if (docTypeFilter) params.set("docType", docTypeFilter);

  const { data, isLoading } = useQuery({
    queryKey: ["kyc", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/admin/api/kyc?${params.toString()}`);
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (body: { id: string; status: string; rejectionReason?: string }) => {
      const res = await fetch("/admin/api/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc"] });
      setRejectDialog(null);
      setRejectionReason("");
    },
  });

  const columns: ColumnDef<KYCRow, any>[] = [
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
      accessorKey: "docType",
      header: "Document",
      cell: ({ row }) => row.original.docType.replace(/_/g, " "),
    },
    {
      accessorKey: "country",
      header: "Country",
      cell: ({ row }) => row.original.country || "\u2014",
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
      accessorKey: "reviewedBy",
      header: "Reviewed By",
      cell: ({ row }) => row.original.reviewedBy || "\u2014",
    },
    {
      accessorKey: "rejectionReason",
      header: "Reason",
      cell: ({ row }) => row.original.rejectionReason || "\u2014",
    },
    {
      accessorKey: "createdAt",
      header: "Submitted",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        if (row.original.status !== "PENDING") return null;
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-600"
              onClick={() => reviewMutation.mutate({ id: row.original.id, status: "APPROVED" })}
            >
              <Check className="mr-1 h-3 w-3" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600"
              onClick={() => setRejectDialog(row.original.id)}
            >
              <Ban className="mr-1 h-3 w-3" /> Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">KYC Management</h1>
        <p className="text-muted-foreground">
          Review and manage player identity verification documents
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={docTypeFilter}
              onValueChange={(v) => {
                setDocTypeFilter(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Doc Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="PASSPORT">Passport</SelectItem>
                <SelectItem value="DRIVERS_LICENSE">Drivers License</SelectItem>
                <SelectItem value="NATIONAL_ID">National ID</SelectItem>
                <SelectItem value="PROOF_OF_ADDRESS">Proof of Address</SelectItem>
                <SelectItem value="BANK_STATEMENT">Bank Statement</SelectItem>
                <SelectItem value="SELFIE">Selfie</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">Loading...</CardContent>
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

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim()}
              onClick={() =>
                rejectDialog &&
                reviewMutation.mutate({ id: rejectDialog, status: "REJECTED", rejectionReason })
              }
            >
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
