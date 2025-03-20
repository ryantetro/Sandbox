// src/app/api/startScheduler/route.ts
import { NextResponse } from "next/server";
import { startMessageScheduler } from "@/lib/messageScheduler";

export async function GET() {
  try {
    startMessageScheduler();
    return NextResponse.json({ message: "Message scheduler started" });
  } catch (error) {
    console.error("Error starting message scheduler:", error);
    return NextResponse.json({ error: "Failed to start message scheduler" }, { status: 500 });
  }
}