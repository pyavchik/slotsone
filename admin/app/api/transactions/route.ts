import { NextRequest, NextResponse } from "next/server";
import { getAllTransactions } from "@/lib/backend-queries";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "25")));
  const type = sp.get("type") || "";
  const search = sp.get("search") || "";
  const sortBy = sp.get("sortBy") || "createdAt";
  const sortDir = sp.get("sortDir") === "asc" ? "asc" : ("desc" as const);

  const result = await getAllTransactions({
    page,
    pageSize,
    type: type || undefined,
    search: search || undefined,
    sortBy,
    sortDir,
  });

  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  // Backend transactions are immutable (all COMPLETED bet/win)
  const body = await request.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  // No-op for backend transactions, just echo back
  return NextResponse.json({ id, status });
}
