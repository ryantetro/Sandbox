import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
    });

    const taskIds = projects.flatMap((project) => project.taskIds || []);

    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { description, status, priority, startDate, endDate, projectId, subcontractorIds, createdBy } = await request.json();

    // Validate required fields
    if (!description || !createdBy || !projectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Step 1: Create the new task
    const task = await prisma.task.create({
      data: {
        description,
        status,
        priority: priority ? priority : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        projectId,
        subcontractorIds: subcontractorIds || [],
      },
    });

    // Step 2: Update the project's taskIds array with the new task's _id
    await prisma.project.update({
      where: { id: projectId },
      data: {
        taskIds: {
          push: task.id, // Now task.id is available
        },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}