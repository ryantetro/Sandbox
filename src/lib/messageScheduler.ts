// src/lib/messageScheduler.ts
import cron from "node-cron";
import prisma from "./prisma";
import twilio from "twilio";

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  throw new Error("Twilio credentials are not configured properly.");
}

const client = twilio(accountSid, authToken);

// Function to parse the offset (e.g., "-24h" to milliseconds)
const parseOffsetToMilliseconds = (offset: string): number => {
  const value = parseInt(offset.slice(1, -1));
  const unit = offset.slice(-1);
  switch (unit) {
    case "h":
      return value * 60 * 60 * 1000; // Hours to milliseconds
    case "d":
      return value * 24 * 60 * 60 * 1000; // Days to milliseconds
    case "w":
      return value * 7 * 24 * 60 * 60 * 1000; // Weeks to milliseconds
    default:
      return 0;
  }
};

// Function to send messages
const sendScheduledMessages = async () => {
  try {
    console.log("Checking for messages to send...");

    // Fetch all reminder and reschedule messages that haven't been sent yet
    const messages = await prisma.automatedMessage.findMany({
      where: {
        OR: [{ type: "reminder" }, { type: "reschedule" }],
        lastSent: null,
      },
      include: {
        project: true,
      },
    });

    const now = new Date();

    for (const message of messages) {
      // Parse the scheduled date and time
      if (!message.date || !message.time) continue;

      const [year, month, day] = message.date.split("-").map(Number);
      const [hour, minute] = message.time.split(":").map(Number);
      const scheduledDate = new Date(year, month - 1, day, hour, minute);

      // Calculate the send time based on the trigger offset
      const offsetMs = parseOffsetToMilliseconds(
        message.trigger && typeof message.trigger === 'object' && 'offset' in message.trigger && typeof message.trigger.offset === 'string' ? message.trigger.offset : "-24h"
      );
      const sendTime = new Date(scheduledDate.getTime() - offsetMs);

      // If the current time is past the send time, send the message
      if (now >= sendTime) {
        // Fetch subcontractors
        const subcontractors = await prisma.subcontractor.findMany({
          where: {
            id: { in: message.subcontractorIds },
          },
        });

        const sentAt = new Date().toISOString();

        // Send SMS to each subcontractor
        await Promise.all(
          subcontractors.map(async (subcontractor) => {
            try {
              await client.messages.create({
                body: message.content,
                from: twilioPhoneNumber,
                to: subcontractor.phone,
              });
              console.log(`SMS sent to ${subcontractor.phone}: ${message.content}`);

              // Log the message in MessageHistory
              await prisma.messageHistory.create({
                data: {
                  messageId: message.id,
                  content: message.content,
                  recipientId: subcontractor.id,
                  deliveryMethod: message.deliveryMethod,
                  sentAt,
                  status: "Sent",
                },
              });
            } catch (error) {
              console.error(`Failed to send SMS to ${subcontractor.phone}:`, error);
              // Log the failure in MessageHistory
              await prisma.messageHistory.create({
                data: {
                  messageId: message.id,
                  content: message.content,
                  recipientId: subcontractor.id,
                  deliveryMethod: message.deliveryMethod,
                  sentAt,
                  status: "Failed",
                },
              });
            }
          })
        );

        // Update the lastSent field
        await prisma.automatedMessage.update({
          where: { id: message.id },
          data: { lastSent: sentAt },
        });
      }
    }
  } catch (error) {
    console.error("Error in sendScheduledMessages:", error);
  }
};

// Schedule the job to run every minute
export const startMessageScheduler = () => {
  cron.schedule("* * * * *", () => {
    console.log("Running message scheduler...");
    sendScheduledMessages();
  });
};