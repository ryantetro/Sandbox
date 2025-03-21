import { NextResponse } from "next/server";
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

interface Subcontractor {
  id: string;
  name: string;
  phone: string;
  projects: string[];
  role?: string;
  status: string;
}

export async function POST(request: Request) {
  try {
    const { taskId, description, preferredStartDate, preferredEndDate, subcontractorsToSchedule, notes, createdBy } = await request.json();

    if (!taskId || !description) {
      return NextResponse.json({ error: "No task selected" }, { status: 400 });
    }

    if (!createdBy) {
      return NextResponse.json({ error: "Not logged in"}, { status: 401 });
    }

    // Format the subcontractors for the email
    const subcontractorList = subcontractorsToSchedule
      .map((sub: Subcontractor) => `${sub.name} (${sub.role || "N/A"}) (${sub.phone || "N/A"})`)
      .join("\n      ");

    const emailContent = `
      New Task Scheduling Request

      TaskId: ${taskId}
      Description: ${description}

      PreferredStartDate: ${preferredStartDate ? preferredStartDate : "N/A"}
      PreferredEndDate: ${preferredEndDate ? preferredEndDate : "N/A"}

      Subcontractors:
      ${subcontractorList || "No subcontractors assigned"}

      Notes:
      ${notes || "N/A"}
    `

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.RECIPIENT_EMAIL,
      subject: `New Scheduling Request`,
      text: emailContent,
    });

    return NextResponse.json({ status: 201 });
  } catch (error) {
    console.error("POST /api/scheduleTask error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}