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
    });

    if (!subcontractor) {
      return new NextResponse("Subcontractor not found", { status: 404 });
    }

    // Find the most recent reminder or reschedule message sent to this subcontractor
    const messageHistory = await prisma.messageHistory.findFirst({
      where: {
        recipientId: subcontractor.id,
        deliveryMethod: "SMS",
        status: "Sent",
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