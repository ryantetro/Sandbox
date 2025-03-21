// src/app/api/messages/history/route.ts
import prisma from "../../../../lib/prisma"; // Adjust the path
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

    // Fetch message history entries for the user's messages
    const history = await prisma.messageHistory.findMany({
      where: {
        messageId: { in: messageIds },
      },
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