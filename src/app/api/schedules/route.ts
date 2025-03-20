import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  const schedules = await prisma.schedule.findMany();
  return NextResponse.json(schedules);
}

export async function POST(request: Request) {
  const data = await request.json();
  const schedule = await prisma.schedule.create({ data });
  return NextResponse.json(schedule);
}