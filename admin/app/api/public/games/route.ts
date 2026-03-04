import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const inactive = await prisma.game.findMany({
    where: { isActive: false },
    select: { slug: true },
  });

  const res = NextResponse.json({ inactive: inactive.map((g) => g.slug) });

  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET");
  res.headers.set("Cache-Control", "public, max-age=30");

  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
