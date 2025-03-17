"use client"; // Required for handling state and form submission in Next.js App Router

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, companyName }),
    });

    if (res.ok) {
      alert("Signup successful! Redirecting to login...");
      router.push("/auth/login"); // Redirect user to login page
    } else {
      const data = await res.json();
      setError(data.error || "Signup failed. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <h1 className="login-header">Create Your Account</h1>
      <form onSubmit={handleSignup} className="login-form">
        <div className="input-group">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Company Name"
            className="input-field"
            required
          />
        </div>
        <div className="input-group">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            className="input-field"
            required
          />
        </div>
        <div className="input-group">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input-field"
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>
      <p className="signup-link">
        Already have an account? <a href="/auth/login">Login here</a>
      </p>
    </div>
  );
}
