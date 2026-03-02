import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "25")));
  const action = sp.get("action") || "";

  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = action as any;

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { admin: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    data: data.map((a) => ({
      id: a.id,
      adminName: a.admin.name,
      adminEmail: a.admin.email,
      action: a.action,
      targetType: a.targetType,
      targetId: a.targetId,
      before: a.before,
      after: a.after,
      ipAddress: a.ipAddress,
      createdAt: a.createdAt.toISOString(),
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}
