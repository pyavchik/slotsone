"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { formatDate } from "@/lib/utils";
import { Plus, Shield } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  adminName: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  before: any;
  after: any;
  ipAddress: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("admins");
  const [showCreate, setShowCreate] = useState(false);
  const [auditPage, setAuditPage] = useState(1);

  // Create admin form state
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("ADMIN");

  const { data: admins, isLoading: adminsLoading } = useQuery({
    queryKey: ["admins"],
    queryFn: async () => {
      const res = await fetch("/admin/api/settings/admins");
      return res.json();
    },
    enabled: tab === "admins",
  });

  const auditParams = new URLSearchParams();
  auditParams.set("page", String(auditPage));
  auditParams.set("pageSize", "25");

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["audit", auditParams.toString()],
    queryFn: async () => {
      const res = await fetch(`/admin/api/audit?${auditParams.toString()}`);
      return res.json();
    },
    enabled: tab === "audit",
  });

  const createMutation = useMutation({
    mutationFn: async (body: { email: string; name: string; password: string; role: string }) => {
      const res = await fetch("/admin/api/settings/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create admin");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      setShowCreate(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("ADMIN");
    },
  });

  const adminColumns: ColumnDef<AdminUser, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant={row.original.role === "SUPERADMIN" ? "default" : "secondary"}>
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "destructive"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last Login",
      cell: ({ row }) =>
        row.original.lastLoginAt ? formatDate(row.original.lastLoginAt) : "Never",
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  const auditColumns: ColumnDef<AuditEntry, any>[] = [
    {
      accessorKey: "adminName",
      header: "Admin",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.adminName}</div>
          <div className="text-xs text-muted-foreground">{row.original.adminEmail}</div>
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge>,
    },
    {
      accessorKey: "targetType",
      header: "Target",
      cell: ({ row }) => (
        <div className="text-sm">
          <span className="font-medium">{row.original.targetType}</span>
          <span className="text-muted-foreground ml-1 text-xs">
            {row.original.targetId.slice(0, 8)}...
          </span>
        </div>
      ),
    },
    {
      accessorKey: "after",
      header: "Changes",
      cell: ({ row }) => (
        <span className="text-xs font-mono text-muted-foreground max-w-[200px] truncate block">
          {row.original.after ? JSON.stringify(row.original.after).slice(0, 80) : "—"}
        </span>
      ),
    },
    {
      accessorKey: "ipAddress",
      header: "IP",
      cell: ({ row }) => (
        <span className="text-xs font-mono text-muted-foreground">
          {row.original.ipAddress || "—"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage admin users, view audit logs, and configure system settings
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="admins">Admin Users</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Admin
            </Button>
          </div>

          {adminsLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                Loading...
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={adminColumns}
              data={admins?.data || []}
              pageCount={1}
              page={1}
              pageSize={100}
              total={admins?.data?.length || 0}
              onPageChange={() => {}}
            />
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          {auditLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                Loading...
              </CardContent>
            </Card>
          ) : (
            <DataTable
              columns={auditColumns}
              data={auditData?.data || []}
              pageCount={auditData?.pagination?.totalPages || 1}
              page={auditPage}
              pageSize={25}
              total={auditData?.pagination?.total || 0}
              onPageChange={setAuditPage}
            />
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Application</span>
                  <span className="text-sm font-medium">SlotsOne Admin Panel</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <Badge variant="outline">1.0.0</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Framework</span>
                  <span className="text-sm font-medium">Next.js 14</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Database</span>
                  <span className="text-sm font-medium">PostgreSQL 16</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ORM</span>
                  <span className="text-sm font-medium">Prisma</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Currency</span>
                  <span className="text-sm font-medium">EUR</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Default Page Size</span>
                  <span className="text-sm font-medium">25</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Session Timeout</span>
                  <span className="text-sm font-medium">8 hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">AML Threshold (Deposit)</span>
                  <span className="text-sm font-medium">5,000 EUR</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">AML Threshold (Withdrawal)</span>
                  <span className="text-sm font-medium">3,000 EUR</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Admin User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="admin@slotsone.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPERADMIN">Superadmin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createMutation.error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {(createMutation.error as Error).message}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newEmail || !newName || !newPassword || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  email: newEmail,
                  name: newName,
                  password: newPassword,
                  role: newRole,
                })
              }
            >
              {createMutation.isPending ? "Creating..." : "Create Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
