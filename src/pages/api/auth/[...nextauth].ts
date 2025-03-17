// src/pages/api/auth/[...nextauth].ts

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import clientPromise from "../../../lib/mongodb"; // Import MongoDB connection helper

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const client = await clientPromise; // Wait for MongoDB connection
        const db = client.db("sandbox"); // Specify your DB name

        // Find user in the MongoDB database
        const user = await db.collection("users").findOne({ email: credentials?.email });

        // If user found and password matches, return user object
        if (user && bcrypt.compareSync(credentials?.password || "", user.passwordHash)) {
          return {
            email: user.email,
            companyName: user.companyName,
            role: user.role,
          };
        }
        return null; // If user not found or password doesn't match
      },
    }),
  ],
  pages: {
    signIn: "/auth/login", // Customize the login page URL
  },
  session: {
    strategy: "jwt", // Use JSON Web Tokens (JWT) for session management
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.companyName = user.companyName;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.email = token.email;
      session.user.companyName = token.companyName;
      session.user.role = token.role;
      return session;
    },
  },
});
