import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  const history = await prisma.messageHistory.findMany();
  return NextResponse.json(history);
}