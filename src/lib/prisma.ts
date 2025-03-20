// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();
console.log("Loaded MONGODB_URI in lib/prisma.ts:", process.env.MONGODB_URI);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;