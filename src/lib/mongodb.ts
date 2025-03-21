// src/lib/mongodb.ts

import { MongoClient } from "mongodb";

// MongoDB URI stored in .env file
const uri = process.env.MONGO_URI as string;

const client = new MongoClient(uri);

let clientPromise: Promise<MongoClient>;

// This is to handle the connection in a way that works with Next.js (both development and production).
if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so the MongoDB client isn't recreated every time the server restarts
  const globalWithMongo = global as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  clientPromise = client.connect();
}

export default clientPromise;
