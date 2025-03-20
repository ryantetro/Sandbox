import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();


export async function GET() {
  try {
    const subcontractors = await prisma.subcontractor.findMany();
    console.log("GET - Fetched subcontractors:", subcontractors);
    return NextResponse.json(subcontractors);
  } catch (error) {
    console.error("GET - Error fetching subcontractors:", error);
    return NextResponse.json({ error: "Failed to fetch subcontractors" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("POST - Received data:", data);
    const subcontractor = await prisma.subcontractor.create({
      data: {
        name: data.name,
        phone: data.phone,
        projects: data.projects, // Should be an array of strings
        role: data.role,
        status: data.status || "Active",
      },
    });
    console.log("POST - Created subcontractor:", subcontractor);
    return NextResponse.json(subcontractor, { status: 201 });
  } catch (error) {
    console.error("POST - Error creating subcontractor:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// src/app/api/subcontractors/route.ts
export async function DELETE(request: Request) {
    try {
      const { id } = await request.json();
      console.log("DELETE - Subcontractor ID:", id);
      const deletedSubcontractor = await prisma.subcontractor.delete({
        where: { id },
      });
      console.log("DELETE - Deleted subcontractor:", deletedSubcontractor);
      return NextResponse.json(deletedSubcontractor);
    } catch (error) {
      console.error("DELETE - Error deleting subcontractor:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
