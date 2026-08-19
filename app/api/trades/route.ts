import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function serializePrismaData(data: any): any {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sinceIdStr = searchParams.get("since");
    const limitStr = searchParams.get("limit") || "400";
    const limit = Math.min(parseInt(limitStr, 10) || 400, 1000);

    let whereClause = {};

    if (sinceIdStr) {
      const sinceId = BigInt(sinceIdStr);
      whereClause = {
        id: {
          gt: sinceId,
        },
      };
    }

    const trades = await prisma.trade.findMany({
      where: whereClause,
      take: limit,
      orderBy: { timestamp: "desc" },
    });

    // Return the list in chronological order for easier chart appending
    const orderedTrades = trades.reverse();

    return NextResponse.json(serializePrismaData(orderedTrades));
  } catch (error: any) {
    console.error("Failed to fetch trades list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
