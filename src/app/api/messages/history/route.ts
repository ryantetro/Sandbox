// src/app/api/messages/history/route.ts
import prisma from "../../../../lib/prisma"; // Adjust the path
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const history = await prisma.messageHistory.findMany({
      include: {
        automatedMessage: {
          include: {
            project: true,
          },
        },
      },
    });
    return NextResponse.json(history);
  } catch (error) {
    console.error("GET /api/messages/history error:", error);
    return NextResponse.json({ error: "Failed to fetch message history" }, { status: 500 });
  }
}