// src/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/auth/home");
  return null; // This line will never be reached due to the redirect
}