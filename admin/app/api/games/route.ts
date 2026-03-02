import { NextRequest, NextResponse } from "next/server";
import { getGames } from "@/lib/backend-queries";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "25")));
  const search = sp.get("search") || "";

  const result = await getGames({ page, pageSize, search: search || undefined });

  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  // Backend has no game catalog — no-op
  const body = await request.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  return NextResponse.json({
    id,
    isActive: body.isActive ?? true,
    isFeatured: body.isFeatured ?? false,
  });
}
