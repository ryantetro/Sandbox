// src/app/api/schedules/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const schedules = await prisma.schedule.findMany({
      include: {
        project: true,
        subcontractor: true,
      },
    });
    return NextResponse.json(schedules);
  } catch (error) {
    console.error("GET /api/schedules error:", error);
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { projectId, subcontractorId, date, time } = await request.json();

    if (!projectId || !subcontractorId || !date || !time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate projectId
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ error: "Invalid projectId: Project not found" }, { status: 404 });
    }

    // Validate subcontractorId
    const subcontractor = await prisma.subcontractor.findUnique({
      where: { id: subcontractorId },
    });
    if (!subcontractor) {
      return NextResponse.json({ error: "Invalid subcontractorId: Subcontractor not found" }, { status: 404 });
    }

    const schedule = await prisma.schedule.create({
      data: {
        projectId,
        subcontractorId,
        date,
        time,
        confirmed: false,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("POST /api/schedules error:", error);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}