import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const riskLevel = searchParams.get("riskLevel") || "";

  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status as any;
  if (riskLevel) where.riskLevel = riskLevel as any;

  const users = await prisma.user.findMany({ where, take: 10000 });

  const headers = [
    "ID",
    "Username",
    "Email",
    "Status",
    "Role",
    "Balance",
    "KYC",
    "Risk Level",
    "Country",
    "Total Wagered",
    "Registered",
  ];
  const rows = users.map((u) => [
    u.id,
    u.username,
    u.email,
    u.status,
    u.role,
    u.balanceReal.toFixed(2),
    u.kycVerified ? "Yes" : "No",
    u.riskLevel,
    u.country || "",
    u.totalWagered.toFixed(2),
    u.registeredAt.toISOString(),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=players-${new Date().toISOString().slice(0, 10)}.csv`,
    },
  });
}
