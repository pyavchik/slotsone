import { NextRequest, NextResponse } from "next/server";
import { getFinancialReport, getPlayersReport, getGamesReport } from "@/lib/backend-queries";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const report = sp.get("report") || "financial";
  const period = sp.get("period") || "30";
  const days = parseInt(period);

  if (report === "financial") {
    const data = await getFinancialReport(days);
    return NextResponse.json(data);
  }

  if (report === "players") {
    const data = await getPlayersReport(days);
    return NextResponse.json(data);
  }

  if (report === "games") {
    const data = await getGamesReport(days);
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
