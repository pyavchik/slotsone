import { NextRequest, NextResponse } from "next/server";
import { getGames } from "@/lib/backend-queries";
import { prisma } from "@/lib/prisma";
import { getCatalogGame } from "@/lib/game-catalog";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "25")));
  const search = sp.get("search") || "";
  const category = sp.get("category") || "";

  const result = await getGames({
    page,
    pageSize,
    search: search || undefined,
    category: category || undefined,
  });

  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const catalogGame = getCatalogGame(id);
  if (!catalogGame)
    return NextResponse.json({ error: "Game not found in catalog" }, { status: 404 });

  // Build update data from allowed fields
  const data: { isActive?: boolean; isFeatured?: boolean } = {};
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.isFeatured === "boolean") data.isFeatured = body.isFeatured;

  // Upsert: create from catalog if not in Prisma yet, otherwise update
  const game = await prisma.game.upsert({
    where: { slug: id },
    update: data,
    create: {
      slug: catalogGame.slug,
      name: catalogGame.name,
      provider: catalogGame.provider,
      category: catalogGame.category,
      rtp: catalogGame.rtp,
      minBet: catalogGame.minBet,
      maxBet: catalogGame.maxBet,
      isActive: data.isActive ?? true,
      isFeatured: data.isFeatured ?? false,
    },
  });

  return NextResponse.json({
    id: game.slug,
    isActive: game.isActive,
    isFeatured: game.isFeatured,
  });
}
