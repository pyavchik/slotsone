import { NextRequest, NextResponse } from "next/server";
import { getPlayers } from "@/lib/backend-queries";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25")));
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "registeredAt";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : ("desc" as const);

  const result = await getPlayers({ page, pageSize, search: search || undefined, sortBy, sortDir });

  return NextResponse.json(result);
}
