// src/app/api/messages/replies/incoming/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import twilio from "twilio";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const body = formData.get("Body")?.toString().trim().toUpperCase();
    const from = formData.get("From")?.toString(); // Subcontractor's phone number
    const messageSid = formData.get("MessageSid")?.toString();

    if (!body || !from || !messageSid) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Find the subcontractor by phone number
    const subcontractor = await prisma.subcontractor.findFirst({
      where: { phone: from },
      include: { projects: true }, // Include projects to get project IDs
    });

    if (!subcontractor) {
      return new NextResponse("Subcontractor not found", { status: 404 });
    }

    // Get the project IDs associated with the subcontractor
    const subcontractorProjectIds = subcontractor.projects;

    if (subcontractorProjectIds.length === 0) {
      return new NextResponse("Subcontractor not associated with any projects", { status: 404 });
    }

    // Find the projects and their associated users
    const projects = await prisma.project.findMany({
      where: {
        id: { in: subcontractorProjectIds },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (projects.length === 0) {
      return new NextResponse("No matching projects found", { status: 404 });
    }

    // Extract project IDs and ensure they all belong to the same user
    const projectIds = projects.map((project) => project.id);
    const userIds = [...new Set(projects.map((project) => project.userId))];

    if (userIds.length !== 1) {
      // If the subcontractor's projects belong to multiple users, we can't determine which user this reply belongs to
      // In a real-world scenario, you might need to handle this differently (e.g., by including the project ID in the SMS)
      console.warn("Subcontractor is associated with projects from multiple users:", userIds);
      return new NextResponse("Ambiguous user association", { status: 400 });
    }

    const userId = userIds[0];
    if (!userId) {
      return new NextResponse("Project not associated with a user", { status: 404 });
    }

    // Find the most recent reminder or reschedule message sent to this subcontractor
    const messageHistory = await prisma.messageHistory.findFirst({
      where: {
        recipientId: subcontractor.id,
        deliveryMethod: "SMS",
        status: "Sent",
        automatedMessage: {
          projectId: { in: projectIds }, // Ensure the message belongs to one of the user's projects
        },
      },
      orderBy: { sentAt: "desc" },
      include: {
        automatedMessage: true,
      },
    });

    if (!messageHistory || !messageHistory.automatedMessage) {
      return new NextResponse("No recent message found", { status: 404 });
    }

    const message = messageHistory.automatedMessage;

    if (message.type !== "reminder" && message.type !== "reschedule") {
      return new NextResponse("Message does not require a reply", { status: 400 });
    }

    // Create a MessageReply
    await prisma.messageReply.create({
      data: {
        messageId: message.id,
        subcontractorId: subcontractor.id,
        reply: body,
        createdAt: new Date().toISOString(),
        userId, // Associate the reply with the user
      },
    });

    // If the reply is "YES", update the schedule
    if (body === "YES") {
      const schedule = await prisma.schedule.findFirst({
        where: {
          projectId: message.projectId,
          subcontractorId: subcontractor.id,
          date: message.date,
          time: message.time,
          project: {
            userId, // Ensure the schedule's project belongs to the user
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

    // Respond to Twilio (Twilio expects a TwiML response)
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("Thank you for your reply!");
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("Error handling incoming SMS:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}