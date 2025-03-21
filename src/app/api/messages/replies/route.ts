// src/app/api/messages/replies/route.ts
import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET() {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the user's projects to get their project IDs
    const userProjects = await prisma.project.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const projectIds = userProjects.map((project) => project.id);

    if (projectIds.length === 0) {
      return NextResponse.json([]); // Return empty array if user has no projects
    }

    // Fetch automated messages for the user's projects
    const userMessages = await prisma.automatedMessage.findMany({
      where: {
        projectId: { in: projectIds },
      },
      select: { id: true },
    });

    const messageIds = userMessages.map((message) => message.id);

    if (messageIds.length === 0) {
      return NextResponse.json([]); // Return empty array if user has no messages
    }

    // Fetch replies for the user's messages
    const replies = await prisma.messageReply.findMany({
      where: {
        messageId: { in: messageIds },
      },
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
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId, subcontractorId, reply } = await request.json();

    if (!messageId || !subcontractorId || !reply) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate messageId and ensure it belongs to the user's project
    const message = await prisma.automatedMessage.findFirst({
      where: {
        id: messageId,
        project: {
          userId: session.user.id, // Ensure the message's project belongs to the user
        },
      },
      include: {
        project: true,
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Invalid messageId: AutomatedMessage not found or not authorized" },
        { status: 404 }
      );
    }

    // Validate subcontractorId and ensure they are associated with the project
    const subcontractor = await prisma.subcontractor.findFirst({
      where: {
        id: subcontractorId,
        projects: { has: message.projectId }, // Ensure the subcontractor is associated with the project
      },
    });

    if (!subcontractor) {
      return NextResponse.json(
        { error: "Invalid subcontractorId: Subcontractor not found or not associated with the project" },
        { status: 404 }
      );
    }

    // Create the message reply
    const messageReply = await prisma.messageReply.create({
      data: {
        messageId,
        subcontractorId,
        reply,
        userId: session.user.id, // Associate the reply with the user
      },
    });

    // If the reply is "YES", update the schedule confirmation
    if (reply.toUpperCase() === "YES") {
      if (message.type === "reminder" || message.type === "reschedule") {
        const schedule = await prisma.schedule.findFirst({
          where: {
            projectId: message.projectId,
            subcontractorId,
            date: message.date,
            time: message.time,
            project: {
              userId: session.user.id, // Ensure the schedule's project belongs to the user
            },
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