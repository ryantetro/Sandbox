// src/app/api/projects/route.ts
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { NextResponse } from "next/server";

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

    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id as string },
    });
    const { name, jobSiteAddress, subcontractorIds } = await request.json();
    if (!name || !jobSiteAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const project = await prisma.project.create({
      data: {
        name,
        jobSiteAddress,
        subcontractorIds: subcontractorIds || [],
        userId: user?.id as string
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, subcontractorIds } = await request.json();
    if (!id || !subcontractorIds) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if the project exists
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Update the project with the new subcontractorIds
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        subcontractorIds,
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("PATCH /api/projects error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}