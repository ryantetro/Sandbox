import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  const projects = await prisma.project.findMany();
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const data = await request.json();
  const project = await prisma.project.create({ data });
  return NextResponse.json(project);
}

// src/app/api/projects/route.ts
export async function PUT(request: Request) {
    try {
      const data = await request.json();
      console.log("PUT - Received data:", data);
      const project = await prisma.project.update({
        where: { id: data.id },
        data: {
          subcontractorIds: data.subcontractorIds,
        },
      });
      console.log("PUT - Updated project:", project);
      return NextResponse.json(project);
    } catch (error) {
      console.error("PUT - Error updating project:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }