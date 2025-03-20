// src/app/api/projects/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const projects = await prisma.project.findMany();
    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, jobSiteAddress, subcontractorIds } = await request.json();
    if (!name || !jobSiteAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const project = await prisma.project.create({
      data: {
        name,
        jobSiteAddress,
        subcontractorIds: subcontractorIds || [],
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