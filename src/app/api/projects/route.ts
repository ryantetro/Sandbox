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

    console.log("Querying projects for userId:", session.user.id);

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
    });

    console.log("Projects:", projects);

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

    const { name, jobSiteAddress, subcontractorIds } = await request.json();
    if (!name || !jobSiteAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate that the provided subcontractors belong to the user
    if (subcontractorIds && subcontractorIds.length > 0) {
      const userSubcontractors = await prisma.subcontractor.findMany({
        where: {
          id: { in: subcontractorIds },
          userId: session.user.id,
        },
      });

      if (userSubcontractors.length !== subcontractorIds.length) {
        return NextResponse.json(
          { error: "One or more subcontractor IDs are invalid or not authorized" },
          { status: 400 }
        );
      }
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        name,
        jobSiteAddress,
        subcontractorIds: subcontractorIds || [],
        userId: session.user.id,
      },
    });

    // Update the subcontractors' projects field to include the new project ID
    if (subcontractorIds && subcontractorIds.length > 0) {
      await Promise.all(
        subcontractorIds.map(async (subcontractorId: string) => {
          const subcontractor = await prisma.subcontractor.findUnique({
            where: { id: subcontractorId },
          });

          if (subcontractor) {
            const updatedProjects = Array.from(new Set([...subcontractor.projects, project.id]));
            await prisma.subcontractor.update({
              where: { id: subcontractorId },
              data: { projects: updatedProjects },
            });
          }
        })
      );
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, subcontractorIds } = await request.json();
    if (!id || !subcontractorIds) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if the project exists and belongs to the user
    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or not authorized" },
        { status: 404 }
      );
    }

    // Validate that the updated subcontractors belong to the user
    if (subcontractorIds.length > 0) {
      const userSubcontractors = await prisma.subcontractor.findMany({
        where: {
          id: { in: subcontractorIds },
          userId: session.user.id,
        },
      });

      if (userSubcontractors.length !== subcontractorIds.length) {
        return NextResponse.json(
          { error: "One or more subcontractor IDs are invalid or not authorized" },
          { status: 400 }
        );
      }
    }

    // Get the current subcontractors associated with the project
    const oldSubcontractorIds = project.subcontractorIds || [];
    const newSubcontractorIds = subcontractorIds || [];

    // Update the project with the new subcontractorIds
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        subcontractorIds: newSubcontractorIds,
      },
    });

    // Update the subcontractors' projects field
    // 1. Remove the project ID from subcontractors that were removed
    const removedSubcontractors = oldSubcontractorIds.filter(
      (subId: string) => !newSubcontractorIds.includes(subId)
    );
    await Promise.all(
      removedSubcontractors.map(async (subcontractorId: string) => {
        const subcontractor = await prisma.subcontractor.findUnique({
          where: { id: subcontractorId },
        });

        if (subcontractor) {
          const updatedProjects = subcontractor.projects.filter((projId: string) => projId !== id);
          await prisma.subcontractor.update({
            where: { id: subcontractorId },
            data: { projects: updatedProjects },
          });
        }
      })
    );

    // 2. Add the project ID to subcontractors that were added
    const addedSubcontractors = newSubcontractorIds.filter(
      (subId: string) => !oldSubcontractorIds.includes(subId)
    );
    await Promise.all(
      addedSubcontractors.map(async (subcontractorId: string) => {
        const subcontractor = await prisma.subcontractor.findUnique({
          where: { id: subcontractorId },
        });

        if (subcontractor) {
          const updatedProjects = Array.from(new Set([...subcontractor.projects, id]));
          await prisma.subcontractor.update({
            where: { id: subcontractorId },
            data: { projects: updatedProjects },
          });
        }
      })
    );

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("PATCH /api/projects error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}