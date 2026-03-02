import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "25")));
  const type = sp.get("type") || "";
  const status = sp.get("status") || "";
  const search = sp.get("search") || "";
  const sortBy = sp.get("sortBy") || "createdAt";
  const sortDir = sp.get("sortDir") === "asc" ? "asc" : "desc";

  const where: Prisma.TransactionWhereInput = {};
  if (type) where.type = type as any;
  if (status) where.status = status as any;
  if (search) {
    where.user = {
      OR: [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { username: true, email: true } } },
    }),
    prisma.transaction.count({ where }),
  ]);

  return NextResponse.json({
    data: data.map((t) => ({
      id: t.id,
      userId: t.userId,
      username: t.user.username,
      email: t.user.email,
      type: t.type,
      amount: t.amount.toFixed(2),
      status: t.status,
      balanceBefore: t.balanceBefore.toFixed(2),
      balanceAfter: t.balanceAfter.toFixed(2),
      currency: t.currency,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  const tx = await prisma.transaction.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ id: tx.id, status: tx.status });
}
