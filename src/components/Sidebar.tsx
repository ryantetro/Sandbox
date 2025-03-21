// src/components/Sidebar.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, FileText, Calendar, User, Settings, LogOut } from "lucide-react";

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", path: "/auth/dashboard", icon: <Home className="sidebar-icon" /> },
    { name: "Messaging", path: "/auth/dashboard/messaging", icon: <MessageSquare className="sidebar-icon" /> },
    { name: "Tasks", path: "/auth/dashboard/tasks", icon: <FileText className="sidebar-icon" /> },
    { name: "Calendar", path: "/auth/dashboard/calendar", icon: <Calendar className="sidebar-icon" /> },
    { name: "Profile", path: "/auth/dashboard/profile", icon: <User className="sidebar-icon" /> },
    { name: "Settings", path: "/auth/dashboard/settings", icon: <Settings className="sidebar-icon" /> },
  ];

  const handleLogout = () => {
    signOut({ callbackUrl: "/auth/home" });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">
          {session?.user?.companyName || "BuildRiser"} Dashboard
        </h1>
        <p className="sidebar-user">
          {session?.user?.name || "User"}
        </p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          // Check if the current path matches the item's path or a subpath (e.g., /auth/dashboard/tasks)
          const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== "/auth/dashboard");
          return (
            <Link
              key={item.name}
              href={item.path}
              className={`sidebar-link ${isActive ? "active" : ""}`}
            >
              {item.icon}
              <span className="sidebar-text">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <button onClick={handleLogout} className="sidebar-logout">
        <LogOut className="sidebar-logout-icon" />
        <span>Logout</span>
      </button>
    </aside>
  );
}