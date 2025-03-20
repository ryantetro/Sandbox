import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  const messages = await prisma.automatedMessage.findMany();
  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  const data = await request.json();
  const message = await prisma.automatedMessage.create({ data });
  return NextResponse.json(message);
}