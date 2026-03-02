import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "25")));
  const status = sp.get("status") || "";
  const docType = sp.get("docType") || "";

  const where: Prisma.KYCDocumentWhereInput = {};
  if (status) where.status = status as any;
  if (docType) where.docType = docType as any;

  const [data, total] = await Promise.all([
    prisma.kYCDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { username: true, email: true, country: true } },
        reviewer: { select: { name: true } },
      },
    }),
    prisma.kYCDocument.count({ where }),
  ]);

  return NextResponse.json({
    data: data.map((d) => ({
      id: d.id,
      userId: d.userId,
      username: d.user.username,
      email: d.user.email,
      country: d.user.country,
      docType: d.docType,
      status: d.status,
      fileUrl: d.fileUrl,
      reviewedBy: d.reviewer?.name || null,
      rejectionReason: d.rejectionReason,
      createdAt: d.createdAt.toISOString(),
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, status, rejectionReason, reviewedBy } = body;

  if (!id || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const doc = await prisma.kYCDocument.update({
    where: { id },
    data: {
      status,
      rejectionReason: status === "REJECTED" ? rejectionReason : null,
      reviewedBy,
    },
  });

  // If approved, update user KYC status
  if (status === "APPROVED") {
    const allDocs = await prisma.kYCDocument.findMany({
      where: { userId: doc.userId },
    });
    const allApproved = allDocs.every((d) => d.status === "APPROVED");
    if (allApproved) {
      await prisma.user.update({
        where: { id: doc.userId },
        data: { kycVerified: true },
      });
    }
  }

  return NextResponse.json({ id: doc.id, status: doc.status });
}
