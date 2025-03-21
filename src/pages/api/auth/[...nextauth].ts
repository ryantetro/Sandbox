import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import clientPromise from "../../../lib/mongodb";

// Explicitly type authOptions as AuthOptions
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const client = await clientPromise;
        const db = client.db("sandbox");

        const user = await db.collection("users").findOne({ email: credentials?.email });

        if (user && bcrypt.compareSync(credentials?.password || "", user.passwordHash)) {
          return {
            id: user._id.toString(), // Ensure ID is a string
            email: user.email,
            companyName: user.companyName,
            role: user.role,
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt" as const, // Use "as const" to enforce literal type
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.companyName = user.companyName;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string; // Ensure ID is typed as string
      session.user.email = token.email as string;
      session.user.companyName = token.companyName as string;
      session.user.role = token.role as string;
      return session;
    },
  },
};

export default NextAuth(authOptions);