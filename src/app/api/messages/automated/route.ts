// src/app/api/messages/automated/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import twilio from "twilio";
import { startMessageScheduler } from "@/lib/messageScheduler";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  throw new Error("Twilio credentials are not configured properly.");
}

const client = twilio(accountSid, authToken);

// Start the message scheduler (runs only once due to module caching)
startMessageScheduler();

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

    // Fetch automated messages only for the user's projects
    const messages = await prisma.automatedMessage.findMany({
      where: {
        projectId: { in: projectIds },
      },
      include: {
        project: true,
        replies: true,
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("GET /api/messages/automated error:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Get the authenticated user's session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      content,
      projectId,
      deliveryMethod,
      trigger,
      status,
      date,
      time,
      type,
      subcontractorIds,
    } = await request.json();

    // Validate required fields
    if (!name || !projectId || !content || !deliveryMethod || !trigger || !status || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch the project and ensure it belongs to the authenticated user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id, // Ensure the project belongs to the user
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or not authorized" },
        { status: 404 }
      );
    }

    // Replace placeholders in the message content
    let formattedContent = content
      .replace("{ProjectName}", project.name)
      .replace("{JobSiteAddress}", project.jobSiteAddress)
      .replace("{Date}", date || "TBD")
      .replace("{Time}", time || "TBD");

    // Create the automated message
    const automatedMessage = await prisma.automatedMessage.create({
      data: {
        name,
        content: formattedContent,
        projectId,
        deliveryMethod,
        trigger,
        status,
        date,
        time,
        type,
        subcontractorIds: subcontractorIds || project.subcontractorIds,
        id: session.user.id, // Associate the message with the user
      },
      include: {
        project: true,
        replies: true, // Include replies in the response
      },
    });

    // If type is "update", send the message immediately via Twilio
    if (type === "update") {
      // Fetch subcontractors to get their phone numbers
      const subcontractors = await prisma.subcontractor.findMany({
        where: {
          id: { in: subcontractorIds || project.subcontractorIds },
        },
      });

      const sentAt = new Date().toISOString();

      // Send SMS to each subcontractor
      await Promise.all(
        subcontractors.map(async (subcontractor) => {
          try {
            await client.messages.create({
              body: formattedContent,
              from: twilioPhoneNumber,
              to: subcontractor.phone,
            });
            console.log(`SMS sent to ${subcontractor.phone}: ${formattedContent}`);

            // Log the message in MessageHistory
            await prisma.messageHistory.create({
              data: {
                messageId: automatedMessage.id,
                content: formattedContent,
                recipientId: subcontractor.id,
                deliveryMethod,
                sentAt,
                status: "Sent",
              },
            });
          } catch (error) {
            console.error(`Failed to send SMS to ${subcontractor.phone}:`, error);
            // Log the failure in MessageHistory
            await prisma.messageHistory.create({
              data: {
                messageId: automatedMessage.id,
                content: formattedContent,
                recipientId: subcontractor.id,
                deliveryMethod,
                sentAt,
                status: "Failed",
              },
            });
          }
        })
      );

      // Update the lastSent field
      await prisma.automatedMessage.update({
        where: { id: automatedMessage.id },
        data: { lastSent: sentAt },
      });
    }

    return NextResponse.json(automatedMessage, { status: 201 });
  } catch (error) {
    console.error("POST /api/messages/automated error:", error);
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}