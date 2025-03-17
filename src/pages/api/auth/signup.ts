// src/pages/api/auth/signup.ts

import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { NextApiRequest, NextApiResponse } from "next";

// MongoDB connection URI
const uri = process.env.MONGO_URI as string;

console.log("Mongo URI:", uri); // Debugging line to check if uri is loaded correctly

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { email, password, companyName } = req.body;

    try {
      if (!email || !password || !companyName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Ensure the URI is defined
      if (!uri) {
        return res.status(500).json({ error: "MongoDB URI is not defined" });
      }

      const client = await MongoClient.connect(uri);
      const db = client.db("sandbox");

      // Check if user already exists
      const existingUser = await db.collection("users").findOne({ email });

      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user into the database
      await db.collection("users").insertOne({
        email,
        passwordHash: hashedPassword,
        companyName,
        role: "User", // Default role
      });

      client.close();
      return res.status(201).json({ message: "User created successfully!" });
    } catch (error) {
      console.error("Error during signup:", error);  // Log the error for debugging
      return res.status(500).json({ error: "Signup failed. Please try again." });
    }
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
