// src/app/auth/home/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FaHardHat, FaSignInAlt, FaUserPlus } from "react-icons/fa";
import "../styles/home.css";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"login" | "signup">("login");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", companyName: "" });
  const [isLoading, setIsLoading] = useState(false);

  const openModal = (type: "login" | "signup") => {
    setModalType(type);
    setIsModalOpen(true);
    setLoginError(null);
    setSignupError(null);
    setSignupSuccess(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setLoginError(null);
    setSignupError(null);
    setSignupSuccess(null);
    setLoginForm({ email: "", password: "" });
    setSignupForm({ name: "", email: "", password: "", companyName: "" });
  };

  const switchForm = (type: "login" | "signup") => {
    setModalType(type);
    setLoginError(null);
    setSignupError(null);
    setSignupSuccess(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    const result = await signIn("credentials", {
      redirect: false,
      email: loginForm.email,
      password: loginForm.password,
    });

    setIsLoading(false);

    if (result?.error) {
      setLoginError("Invalid email or password.");
    } else {
      setLoginError(null);
      closeModal();
      // The useEffect below will handle the redirect to the dashboard
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSignupError(null);
    setSignupSuccess(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: signupForm.name,
          email: signupForm.email,
          password: signupForm.password,
          companyName: signupForm.companyName,
        }),
      });

      const data = await response.json();

      setIsLoading(false);

      if (!response.ok) {
        setSignupError(data.error || "Signup failed. Please try again.");
        return;
      }

      setSignupSuccess("Signup successful! Please log in.");
      setModalType("login");
      setSignupForm({ name: "", email: "", password: "", companyName: "" });
    } catch (error) {
      setIsLoading(false);
      setSignupError(`Failed to create account. Please try again. ${error}`);
    }
  };

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/auth/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="loading-container">
        Loading...
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="logo">
          <h1 className="logo-text">BuildRiser</h1>
        </div>
        <div className="nav-links">
          <Link href="#learn-more" className="nav-link">
            Learn More
          </Link>
          {session ? (
            <Link href="/auth/dashboard" className="nav-btn dashboard-btn">
              Dashboard
            </Link>
          ) : (
            <>
              <button className="nav-btn login-btn" onClick={() => openModal("login")}>
                <FaSignInAlt className="btn-icon" /> Login
              </button>
              <button className="nav-btn signup-btn" onClick={() => openModal("signup")}>
                <FaUserPlus className="btn-icon" /> Sign Up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            Helping you build the Future, One Schedule at a Time
          </h1>
          <p className="hero-subtitle">
            At BuildRiser, we provide a top-tier and reliable scheduling management system.
          </p>
          {session ? (
            <Link href="/auth/dashboard" className="cta-btn">
              Go to Dashboard
            </Link>
          ) : (
            <Link href="#learn-more" className="cta-btn">
              Learn More
            </Link>
          )}
        </div>
      </section>

      {/* Learn More Section */}
      <section id="learn-more" className="learn-more">
        <h2 className="learn-more-title">Why Choose BuildRiser?</h2>
        <div className="learn-more-grid">
          <div className="learn-more-card">
            <FaHardHat className="card-icon" />
            <h3 className="card-title">Efficient Scheduling</h3>
            <p className="card-text">
              Save time and reduce stress with automated scheduling that handles messaging, reminders, and rescheduling, keeping your projects on track without the constant phone calls.
            </p>
          </div>
          <div className="learn-more-card">
            <FaHardHat className="card-icon" />
            <h3 className="card-title">Ease of Use</h3>
            <p className="card-text">
              Manage subcontractor schedules with ease through our intuitive, user-friendly interface, designed to help you focus on your projects rather than logistics.
            </p>
          </div>
          <div className="learn-more-card">
            <FaHardHat className="card-icon" />
            <h3 className="card-title">Reliability</h3>
            <p className="card-text">
              Minimize project delays with reliable automated updates and real-time communication, ensuring that everyone stays informed and on schedule.
            </p>
          </div>
        </div>
      </section>

      {/* Login/Signup Modal */}
      {isModalOpen && (
        <div className="modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-btn" onClick={closeModal}>
              ×
            </span>
            {modalType === "login" ? (
              <div className="form-content">
                <h2 className="form-title">Login to Your Account</h2>
                <form onSubmit={handleLogin}>
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    className="form-input"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    disabled={isLoading}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    required
                    className="form-input"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    disabled={isLoading}
                  />
                  <button type="submit" className="form-btn" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </button>
                  {loginError && <p className="error-message">{loginError}</p>}
                </form>
                <p className="form-switch">
                  Don&apos;t have an account?{" "}
                  <a href="#" onClick={() => switchForm("signup")}>
                    Sign Up
                  </a>
                </p>
              </div>
            ) : (
              <div className="form-content">
                <h2 className="form-title">Create an Account</h2>
                <form onSubmit={handleSignup}>
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    className="form-input"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    disabled={isLoading}
                  />
                  <input
                    type="text"
                    placeholder="Company Name"
                    required
                    className="form-input"
                    value={signupForm.companyName}
                    onChange={(e) => setSignupForm({ ...signupForm, companyName: e.target.value })}
                    disabled={isLoading}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    className="form-input"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    disabled={isLoading}
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    required
                    className="form-input"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    disabled={isLoading}
                  />
                  <button type="submit" className="form-btn" disabled={isLoading}>
                    {isLoading ? "Signing up..." : "Sign Up"}
                  </button>
                  {signupError && <p className="error-message">{signupError}</p>}
                  {signupSuccess && <p className="success-message">{signupSuccess}</p>}
                </form>
                <p className="form-switch">
                  Already have an account?{" "}
                  <a href="#" onClick={() => switchForm("login")}>
                    Login
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 BuildRiser Construction. All Rights Reserved.</p>
      </footer>
    </div>
  );
}