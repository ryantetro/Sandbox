// src/app/api/subcontractors/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const subcontractors = await prisma.subcontractor.findMany();
    return NextResponse.json(subcontractors);
  } catch (error) {
    console.error("GET /api/subcontractors error:", error);
    return NextResponse.json({ error: "Failed to fetch subcontractors" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, phone, projects, role, status } = await request.json();
    if (!name || !phone || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const subcontractor = await prisma.subcontractor.create({
      data: {
        name,
        phone,
        projects: projects || [],
        role,
        status: status || "Active",
      },
    });
    return NextResponse.json(subcontractor, { status: 201 });
  } catch (error) {
    console.error("POST /api/subcontractors error:", error);
    return NextResponse.json({ error: "Failed to create subcontractor" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, projects } = await request.json();
    if (!id || !projects) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const subcontractor = await prisma.subcontractor.findUnique({
      where: { id },
    });

    if (!subcontractor) {
      return NextResponse.json({ error: "Subcontractor not found" }, { status: 404 });
    }

    const updatedSubcontractor = await prisma.subcontractor.update({
      where: { id },
      data: {
        projects,
      },
    });

    return NextResponse.json(updatedSubcontractor);
  } catch (error) {
    console.error("PATCH /api/subcontractors error:", error);
    return NextResponse.json({ error: "Failed to update subcontractor" }, { status: 500 });
  }
}