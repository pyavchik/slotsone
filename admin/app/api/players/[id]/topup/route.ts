import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { topupPlayerBalance, getPlayerById } from "@/lib/backend-queries";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const amount = Number(body.amount);

  if (!amount || amount <= 0 || amount > 100000) {
    return NextResponse.json(
      { error: "Amount must be between $0.01 and $100,000" },
      { status: 400 }
    );
  }

  const player = await getPlayerById(params.id);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const amountCents = Math.round(amount * 100);
  const result = await topupPlayerBalance(params.id, amountCents);

  if (!result) {
    return NextResponse.json({ error: "Failed to credit wallet" }, { status: 500 });
  }

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        action: "BALANCE_ADJUSTMENT",
        targetType: "User",
        targetId: params.id,
        after: {
          amount,
          amountCents,
          newBalanceCents: result.balanceCents,
          transactionId: result.transactionId,
        },
      },
    });
  } catch {
    // Audit log failure should not block the top-up
  }

  return NextResponse.json({
    success: true,
    credited: amount,
    balance: (result.balanceCents / 100).toFixed(2),
    transactionId: result.transactionId,
  });
}
