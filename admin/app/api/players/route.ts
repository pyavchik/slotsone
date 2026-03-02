import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25")));
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const riskLevel = searchParams.get("riskLevel") || "";
  const kycVerified = searchParams.get("kycVerified") || "";
  const country = searchParams.get("country") || "";
  const sortBy = searchParams.get("sortBy") || "registeredAt";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status as any;
  if (riskLevel) where.riskLevel = riskLevel as any;
  if (kycVerified) where.kycVerified = kycVerified === "true";
  if (country) where.country = country;

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data: data.map((u) => ({
      ...u,
      balanceReal: u.balanceReal.toFixed(2),
      balanceBonus: u.balanceBonus.toFixed(2),
      totalDeposited: u.totalDeposited.toFixed(2),
      totalWithdrawn: u.totalWithdrawn.toFixed(2),
      totalWagered: u.totalWagered.toFixed(2),
      totalWon: u.totalWon.toFixed(2),
      registeredAt: u.registeredAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      lastLoginAt: u.lastLoginAt?.toISOString() || null,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
