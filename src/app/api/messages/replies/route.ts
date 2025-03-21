// src/app/api/messages/replies/route.ts
import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const replies = await prisma.messageReply.findMany({
      include: {
        message: true,
        subcontractor: true,
      },
    });
    return NextResponse.json(replies);
  } catch (error) {
    console.error("GET /api/messages/replies error:", error);
    return NextResponse.json({ error: "Failed to fetch replies" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { messageId, subcontractorId, reply } = await request.json();

    if (!messageId || !subcontractorId || !reply) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate messageId
    const message = await prisma.automatedMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      return NextResponse.json({ error: "Invalid messageId: AutomatedMessage not found" }, { status: 404 });
    }

    // Validate subcontractorId
    const subcontractor = await prisma.subcontractor.findUnique({
      where: { id: subcontractorId },
    });
    if (!subcontractor) {
      return NextResponse.json({ error: "Invalid subcontractorId: Subcontractor not found" }, { status: 404 });
    }

    const messageReply = await prisma.messageReply.create({
      data: {
        messageId,
        subcontractorId,
        reply,
      },
    });

    // If the reply is "YES", update the schedule confirmation
    if (reply.toUpperCase() === "YES") {
      const messageWithProject = await prisma.automatedMessage.findUnique({
        where: { id: messageId },
        include: { project: true },
      });

      if (messageWithProject && (messageWithProject.type === "reminder" || messageWithProject.type === "reschedule")) {
        const schedule = await prisma.schedule.findFirst({
          where: {
            projectId: messageWithProject.projectId,
            subcontractorId,
            date: messageWithProject.date ?? undefined,
            time: messageWithProject.time ?? undefined,
          },
        });

        if (schedule) {
          await prisma.schedule.update({
            where: { id: schedule.id },
            data: { confirmed: true },
          });
        }
      }
    }

    return NextResponse.json(messageReply, { status: 201 });
  } catch (error) {
    console.error("POST /api/messages/replies error:", error);
    return NextResponse.json({ error: "Failed to record reply" }, { status: 500 });
  }
}