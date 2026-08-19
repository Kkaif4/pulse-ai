import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function serializePrismaData(data: any): any {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );
}

export async function GET() {
  try {
    const latestTrade = await prisma.trade.findFirst({
      orderBy: { timestamp: "desc" },
    });

    if (!latestTrade) {
      return NextResponse.json({ message: "No trades found yet." }, { status: 404 });
    }

    return NextResponse.json(serializePrismaData(latestTrade));
  } catch (error: any) {
    console.error("Failed to fetch latest trade:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
