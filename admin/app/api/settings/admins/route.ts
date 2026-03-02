import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const admins = await prisma.adminUser.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    data: admins.map((a) => ({
      ...a,
      lastLoginAt: a.lastLoginAt?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, name, password, role } = body;

  if (!email || !name || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.adminUser.create({
    data: { email, name, passwordHash, role: role || "ADMIN" },
  });

  return NextResponse.json(
    { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    { status: 201 }
  );
}
