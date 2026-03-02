import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "25")));
  const type = sp.get("type") || "";
  const status = sp.get("status") || "";
  const tab = sp.get("tab") || "bonuses";

  if (tab === "promotions") {
    const where: Prisma.PromotionWhereInput = {};
    const [data, total] = await Promise.all([
      prisma.promotion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { bonuses: true } } },
      }),
      prisma.promotion.count({ where }),
    ]);
    return NextResponse.json({
      data: data.map((p) => ({
        ...p,
        amount: p.amount.toFixed(2),
        wagerRequirement: p.wagerRequirement.toFixed(2),
        startsAt: p.startsAt.toISOString(),
        endsAt: p.endsAt?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        bonusCount: p._count.bonuses,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  }

  const where: Prisma.BonusWhereInput = {};
  if (type) where.type = type as any;
  if (status) where.status = status as any;

  const [data, total] = await Promise.all([
    prisma.bonus.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { username: true, email: true } },
        promotion: { select: { name: true } },
      },
    }),
    prisma.bonus.count({ where }),
  ]);

  return NextResponse.json({
    data: data.map((b) => ({
      id: b.id,
      userId: b.userId,
      username: b.user.username,
      email: b.user.email,
      type: b.type,
      status: b.status,
      amount: b.amount.toFixed(2),
      wagerRequirement: b.wagerRequirement.toFixed(2),
      wagered: b.wagered.toFixed(2),
      promotionName: b.promotion?.name || null,
      expiresAt: b.expiresAt?.toISOString() || null,
      createdAt: b.createdAt.toISOString(),
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
