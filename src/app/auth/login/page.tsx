// src/app/auth/login.tsx
"use client"; // Ensures this file runs on the client-side only

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "../styles/login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Call NextAuth's signIn function with the credentials provider
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      alert("Invalid credentials");
    } else {
      router.push("/auth/dashboard"); // Redirect user to dashboard
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Company Logo */}
        <div className="login-logo">BR</div>
        <h1 className="login-title">Welcome to BuildRiser</h1>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="login-form">
          <div>
            <label htmlFor="email" className="login-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login-input"
            />
          </div>
          <div>
            <label htmlFor="password" className="login-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
            />
          </div>
          <button type="submit" disabled={loading} className="login-button">
            {loading ? (
              <>
                <span className="spinner"></span> Logging in...
              </>
            ) : (
              "Log In"
            )}
          </button>
          <Link href="/auth/forgot-password" className="forgot-password">
            Forgot Password?
          </Link>
        </form>
      </div>

      {/* Footer */}
      <footer className="login-footer">
        <p>&copy; 2025 BuildRiser. Building the Future, One Project at a Time.</p>
      </footer>
    </div>
  );
}